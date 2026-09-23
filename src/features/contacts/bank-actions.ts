"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { contactBankAccounts } from "@/server/db/schema";
import { bankAccountArchiveSchema, bankAccountSchema } from "./schemas";

/**
 * A contact's bank account: what a supplier is paid to, and how an incoming payment from an
 * unknown name is recognised. The same IBAN twice on one contact is refused.
 */
export async function addBankAccount(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = bankAccountSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const [twice] = await db
    .select({ id: contactBankAccounts.id })
    .from(contactBankAccounts)
    .where(
      and(
        eq(contactBankAccounts.contactId, d.contactId),
        eq(contactBankAccounts.iban, d.iban),
        isNull(contactBankAccounts.archivedAt),
      ),
    );
  if (twice) return fail("This IBAN is already on the contact.");
  const [row] = await db
    .insert(contactBankAccounts)
    .values({ ...d, createdBy: user.id, updatedBy: user.id })
    .returning({ id: contactBankAccounts.id });
  await audit(db, {
    action: "contact.bank.add",
    userId: user.id,
    entity: "contact",
    entityId: d.contactId,
    detail: { account: row.id },
  });
  revalidatePath(`/contacts/${d.contactId}`);
  return { ok: true, data: undefined, message: "IBAN added" };
}

/** Removed from use with a reason, never deleted: past payments still point at it. */
export async function archiveBankAccount(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = bankAccountArchiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, contactId, reason } = parsed.data;
  await db
    .update(contactBankAccounts)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(and(eq(contactBankAccounts.id, id), eq(contactBankAccounts.contactId, contactId)));
  await audit(db, {
    action: "contact.bank.archive",
    userId: user.id,
    entity: "contact",
    entityId: contactId,
    detail: { account: id, reason },
  });
  revalidatePath(`/contacts/${contactId}`);
  return { ok: true, data: undefined, message: "IBAN removed" };
}
