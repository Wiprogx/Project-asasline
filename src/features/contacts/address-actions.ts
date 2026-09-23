"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { contactAddresses } from "@/server/db/schema";
import { addressArchiveSchema, addressSchema } from "./schemas";

async function settle(contactId: string) {
  await invalidateTags(tags.contacts, tags.contact(contactId));
  revalidatePath(`/contacts/${contactId}`);
}

/** A child address: loading, delivery, invoicing, a consignee… found by the contacts search too. */
export async function addAddress(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = addressSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const [row] = await db
    .insert(contactAddresses)
    .values({ ...parsed.data, createdBy: user.id, updatedBy: user.id })
    .returning({ id: contactAddresses.id });
  await audit(db, {
    action: "contact.address.add",
    userId: user.id,
    entity: "contact",
    entityId: parsed.data.contactId,
    detail: { address: row.id, type: parsed.data.type },
  });
  await settle(parsed.data.contactId);
  return { ok: true, data: undefined, message: `${parsed.data.type} added` };
}

/** Removed from use with a reason, never deleted: bookings may still point at it. */
export async function archiveAddress(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = addressArchiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, contactId, reason } = parsed.data;
  await db
    .update(contactAddresses)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(and(eq(contactAddresses.id, id), eq(contactAddresses.contactId, contactId)));
  await audit(db, {
    action: "contact.address.archive",
    userId: user.id,
    entity: "contact",
    entityId: contactId,
    detail: { address: id, reason },
  });
  await settle(contactId);
  return { ok: true, data: undefined, message: "Address removed" };
}
