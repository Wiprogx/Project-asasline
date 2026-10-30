import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ALLOWED_TYPES, extensionOf, fileProblem } from "@/domain/files";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { liveLookupIdByLabel } from "@/server/lookups";
import { isPartyOn } from "@/server/booking-parties";
import {
  bookingFiles,
  bookings,
  contactFiles,
  contacts,
  invoiceFiles,
  invoices,
} from "@/server/db/schema";
import { openStoredFile, storeFile } from "@/server/files";
import { contactFileSchema } from "./schemas";

/**
 * A paper kept on the contact itself (legacy contact docs): a contract, a power of attorney,
 * an ID. One file per call, so the uploader shows each file's own progress and outcome; the
 * bytes go to the contact's folder (the bucket when configured, else FILES_DIR).
 */
export async function keepContactFile(
  contactId: string,
  fd: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("app.contacts");
  const parsed = contactFileSchema.safeParse({ ...formToObject(fd), contactId });
  const file = fd.get("file");
  if (!parsed.success) return invalid(parsed.error);
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file.");
  const problem = fileProblem(file);
  if (problem) return fail(problem);
  const [c] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.id, parsed.data.contactId));
  if (!c) return fail("This contact no longer exists.");
  const kindId = await liveLookupIdByLabel(db, "contact-doc-kinds", parsed.data.kind);
  if (!kindId)
    return fail(`"${parsed.data.kind}" is not in Settings › Lists › Contact document kinds.`);
  const ext = extensionOf(file.name);
  const storedName = `${randomUUID()}${ext}`;
  try {
    await storeFile(c.id, storedName, new Uint8Array(await file.arrayBuffer()), "contacts");
  } catch (e) {
    console.error(e);
    return fail(`"${file.name}" could not be stored. Try again; if it persists, tell an Admin.`);
  }
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contactFiles)
      .values({
        contactId: c.id,
        kindId,
        name: file.name.trim().slice(0, 200),
        storedName,
        mime: ALLOWED_TYPES[ext] ?? "application/octet-stream",
        sizeBytes: file.size,
        note: parsed.data.note || null,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: contactFiles.id });
    await audit(tx, {
      action: "contact.file.add",
      userId: user.id,
      entity: "contact",
      entityId: c.id,
      detail: { file: row.id, name: file.name, kind: parsed.data.kind },
    });
    return row.id;
  });
  revalidatePath(`/contacts/${c.id}`, "layout");
  return { ok: true, data: { id }, message: `Kept — ${file.name}` };
}

export type PaperWhere = "contact" | "booking" | "invoice";

/** The row of a paper on the contact's file, only if it really is on this contact's file. */
async function paperRow(contactId: string, where: PaperWhere, fileId: string) {
  if (where === "contact") {
    const [f] = await db
      .select({ name: contactFiles.name, mime: contactFiles.mime, stored: contactFiles.storedName })
      .from(contactFiles)
      .where(
        and(
          eq(contactFiles.id, fileId),
          eq(contactFiles.contactId, contactId),
          isNull(contactFiles.archivedAt),
        ),
      );
    return f ? { ...f, ownerId: contactId, owner: "contacts" as const } : null;
  }
  if (where === "booking") {
    const [f] = await db
      .select({
        name: bookingFiles.name,
        mime: bookingFiles.mime,
        stored: bookingFiles.storedName,
        ownerId: bookings.id,
      })
      .from(bookingFiles)
      .innerJoin(bookings, eq(bookings.id, bookingFiles.bookingId))
      .where(
        and(eq(bookingFiles.id, fileId), isNull(bookingFiles.archivedAt), isPartyOn(contactId)),
      );
    return f ? { ...f, owner: "bookings" as const } : null;
  }
  const [f] = await db
    .select({
      name: invoiceFiles.name,
      mime: invoiceFiles.mime,
      stored: invoiceFiles.storedName,
      ownerId: invoices.id,
    })
    .from(invoiceFiles)
    .innerJoin(invoices, eq(invoices.id, invoiceFiles.invoiceId))
    .where(
      and(
        eq(invoiceFiles.id, fileId),
        isNull(invoiceFiles.archivedAt),
        eq(invoices.customerId, contactId),
      ),
    );
  return f ? { ...f, owner: "invoices" as const } : null;
}

/** A paper of the contact's file with its bytes (to send it on), or null when it is not there. */
export async function readContactPaper(contactId: string, where: PaperWhere, fileId: string) {
  await requirePermission("app.contacts");
  const f = await paperRow(contactId, where, fileId);
  if (!f) return null;
  const stream = await openStoredFile(f.ownerId, f.stored, f.owner);
  if (!stream) return null;
  return {
    name: f.name,
    mime: f.mime,
    bytes: Buffer.from(await new Response(stream).arrayBuffer()),
  };
}
