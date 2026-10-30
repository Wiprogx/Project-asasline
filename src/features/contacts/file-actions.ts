"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { contactFiles } from "@/server/db/schema";
import { removeContactFileSchema } from "./schemas";

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
