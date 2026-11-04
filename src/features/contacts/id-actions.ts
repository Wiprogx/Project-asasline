"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { registerOf } from "@/domain/registers";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { lookupRegister } from "@/server/registers";
import { labelOf, verdictWords } from "./register-checks";
import { idCheckedSchema } from "./schemas";

/**
 * The number is asked of its register today (legacy "Verify": VIES for a VAT number, the
 * Commission's EORI service for an EORI): known there, the day is written on the contact and
 * what the register said kept on the audit line; unknown or unanswered, nothing is written.
 * A country no register is online for takes the office's word, as in the legacy app.
 */
export async function markIdChecked(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = idCheckedSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, kind } = parsed.data;
  const [c] = await db.select().from(contacts).where(eq(contacts.id, id));
  if (!c) return fail("This contact no longer exists.");
  const value = c[kind];
  const label = labelOf(kind);
  if (!value) return fail(`No ${label} on the contact yet.`);
  const register = registerOf(c.country, kind);
  const answer = await lookupRegister(kind, c.country, value);
  if (register && answer && answer.state !== "valid")
    return fail(verdictWords(kind, register.name, answer));
  const today = officeToday();
  const found = answer?.state === "valid" ? { name: answer.name, address: answer.address } : {};
  await db.transaction(async (tx) => {
    await tx
      .update(contacts)
      .set(kind === "vat" ? { vatCheckedOn: today } : { eoriCheckedOn: today })
      .where(eq(contacts.id, id));
    await audit(tx, {
      action: "contact.idChecked",
      userId: user.id,
      entity: "contact",
      entityId: id,
      detail: { kind, value, on: today, register: register?.name ?? "the office", ...found },
    });
  });
  await invalidateTags(tags.contact(id));
  revalidatePath(`/contacts/${id}`, "layout");
  const message =
    register && answer?.state === "valid"
      ? verdictWords(kind, register.name, answer)
      : `${label} recorded as checked by the office — no online register for ${c.country ?? "this country"}`;
  return { ok: true, data: undefined, message };
}
