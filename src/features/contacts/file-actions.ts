"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ALLOWED_TYPES, extensionOf, fileProblem } from "@/domain/files";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { contactFiles, contacts } from "@/server/db/schema";
import { storeFile } from "@/server/files";
import { contactFileSchema, removeContactFileSchema } from "./schemas";

/** A paper kept on the contact itself (legacy contact docs): a contract, a power of attorney, an ID. */
export async function attachContactFile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = contactFileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file.");
  const problem = fileProblem(file);
  if (problem) return fail(problem);
  const [c] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.id, parsed.data.contactId));
  if (!c) return fail("This contact no longer exists.");
  const ext = extensionOf(file.name);
  const storedName = `${randomUUID()}${ext}`;
  await storeFile(c.id, storedName, new Uint8Array(await file.arrayBuffer()), "contacts");
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contactFiles)
      .values({
        contactId: c.id,
        kind: parsed.data.kind,
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
  });
  revalidatePath(`/contacts/${c.id}`, "layout");
  return { ok: true, data: undefined, message: `Kept — ${file.name}` };
}

/** Taken off with a reason; the bytes and the record stay. */
export async function removeContactFile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = removeContactFileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { contactId, fileId, reason } = parsed.data;
  const rows = await db
    .update(contactFiles)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(
      and(
        eq(contactFiles.id, fileId),
        eq(contactFiles.contactId, contactId),
        isNull(contactFiles.archivedAt),
      ),
    )
    .returning({ id: contactFiles.id });
  if (rows.length === 0) return fail("This file is no longer on the contact.");
  await audit(db, {
    action: "contact.file.remove",
    userId: user.id,
    entity: "contact",
    entityId: contactId,
    detail: { file: fileId, reason },
  });
  revalidatePath(`/contacts/${contactId}`, "layout");
  return { ok: true, data: undefined, message: "Taken off the contact" };
}
