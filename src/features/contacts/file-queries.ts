import "server-only";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bookingFiles, bookings, invoiceFiles, invoices } from "@/server/db/schema";

export type ContactFile = {
  id: string;
  name: string;
  code: string | null;
  sizeBytes: number;
  on: string;
  /** Where it is filed: a shipment the contact is a party on, or a document in its name. */
  where: { kind: "booking" | "invoice"; id: string; ref: string };
  href: string;
};

/**
 * Every paper on the contact's file (legacy contact documents tab): what is filed on the
 * shipments it is a party on, and what is kept with its invoices and bills. Newest first.
 */
export async function filesOfContact(contactId: string): Promise<ContactFile[]> {
  await requirePermission("app.contacts");
  const [onBookings, onInvoices] = await Promise.all([
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
      .where(
        and(
          isNull(bookingFiles.archivedAt),
          or(
            eq(bookings.clientId, contactId),
            eq(bookings.payerId, contactId),
            eq(bookings.shipperId, contactId),
            eq(bookings.consigneeId, contactId),
            eq(bookings.notifyId, contactId),
          ),
        ),
      )
      .orderBy(desc(bookingFiles.createdAt))
      .limit(300),
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
      .limit(300),
  ]);
  const rows: { at: Date; file: ContactFile }[] = [
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
