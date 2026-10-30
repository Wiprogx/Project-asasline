import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { may } from "@/domain/permissions";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import {
  bookingFiles,
  bookings,
  contactDocKinds,
  contactFiles,
  invoiceFiles,
  invoices,
} from "@/server/db/schema";
import { openStoredFile } from "@/server/files";
import { auditAccess } from "@/server/access";
import { isPartyOn } from "@/server/booking-parties";

export type ContactFile = {
  id: string;
  name: string;
  code: string | null;
  sizeBytes: number;
  on: string;
  /** Where it is filed: on the contact itself, a shipment it is a party on, or a document in its name. */
  where: { kind: "contact" | "booking" | "invoice"; id: string; ref: string };
  href: string;
};

/**
 * Every paper on the contact's file (legacy contact documents tab): what is filed on the
 * shipments it is a party on, and what is kept with its invoices and bills. Newest first. A
 * shipment's papers only for who may open bookings, an invoice's only for who may open accounting.
 */
export async function filesOfContact(contactId: string): Promise<ContactFile[]> {
  const user = await requirePermission("app.contacts");
  const [own, onBookings, onInvoices] = await Promise.all([
    db
      .select({
        id: contactFiles.id,
        name: contactFiles.name,
        kind: contactDocKinds.label,
        sizeBytes: contactFiles.sizeBytes,
        createdAt: contactFiles.createdAt,
      })
      .from(contactFiles)
      .innerJoin(contactDocKinds, eq(contactDocKinds.id, contactFiles.kindId))
      .where(and(eq(contactFiles.contactId, contactId), isNull(contactFiles.archivedAt)))
      .orderBy(desc(contactFiles.createdAt))
      .limit(300),
    db
      .select({
        id: bookingFiles.id,
        name: bookingFiles.name,
        code: bookingFiles.code,
        sizeBytes: bookingFiles.sizeBytes,
        createdAt: bookingFiles.createdAt,
        bookingId: bookings.id,
        ref: bookings.ref,
      })
      .from(bookingFiles)
      .innerJoin(bookings, eq(bookings.id, bookingFiles.bookingId))
      .where(and(isNull(bookingFiles.archivedAt), isPartyOn(contactId)))
      .orderBy(desc(bookingFiles.createdAt))
      .limit(300)
      .then((r) => (may(user, "app.bookings") ? r : [])),
    db
      .select({
        id: invoiceFiles.id,
        name: invoiceFiles.name,
        sizeBytes: invoiceFiles.sizeBytes,
        createdAt: invoiceFiles.createdAt,
        invoiceId: invoices.id,
        number: sql<string>`coalesce(${invoices.number}, 'draft')`,
      })
      .from(invoiceFiles)
      .innerJoin(invoices, eq(invoices.id, invoiceFiles.invoiceId))
      .where(and(isNull(invoiceFiles.archivedAt), eq(invoices.customerId, contactId)))
      .orderBy(desc(invoiceFiles.createdAt))
      .limit(300)
      .then((r) => (may(user, "app.accounting") ? r : [])),
  ]);
  const rows: { at: Date; file: ContactFile }[] = [
    ...own.map((f) => ({
      at: f.createdAt,
      file: {
        id: f.id,
        name: f.name,
        code: f.kind,
        sizeBytes: f.sizeBytes,
        on: officeToday(f.createdAt),
        where: { kind: "contact" as const, id: contactId, ref: "The contact" },
        href: `/api/contacts/${contactId}/files/${f.id}`,
      },
    })),
    ...onBookings.map((f) => ({
      at: f.createdAt,
      file: {
        id: f.id,
        name: f.name,
        code: f.code,
        sizeBytes: f.sizeBytes,
        on: officeToday(f.createdAt),
        where: { kind: "booking" as const, id: f.bookingId, ref: f.ref },
        href: `/api/bookings/${f.bookingId}/files/${f.id}`,
      },
    })),
    ...onInvoices.map((f) => ({
      at: f.createdAt,
      file: {
        id: f.id,
        name: f.name,
        code: null,
        sizeBytes: f.sizeBytes,
        on: officeToday(f.createdAt),
        where: { kind: "invoice" as const, id: f.invoiceId, ref: f.number },
        href: `/api/invoices/${f.invoiceId}/files/${f.id}`,
      },
    })),
  ];
  return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).map((r) => r.file);
}

/** A paper kept on the contact, for the browser; the download is logged when watched. */
export async function contactFileForDownload(contactId: string, fileId: string) {
  const user = await requirePermission("app.contacts");
  const [f] = await db
    .select()
    .from(contactFiles)
    .where(and(eq(contactFiles.id, fileId), eq(contactFiles.contactId, contactId)));
  if (!f) return null;
  const stream = await openStoredFile(contactId, f.storedName, "contacts");
  if (stream)
    await auditAccess("download", {
      action: "file.download",
      userId: user.id,
      entity: "contact",
      entityId: contactId,
      detail: { file: f.id, name: f.name },
    });
  return stream ? { stream, name: f.name, mime: f.mime, size: f.sizeBytes } : null;
}
