"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { idProblem } from "@/domain/contacts";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { readIdFormats } from "@/server/id-config";
import { idCheckedSchema } from "./schemas";

/**
 * The office looked the number up in the register today (legacy "Verify": VIES for a VAT number,
 * the EORI database for an EORI) and found it: the day is written on the contact. A number that
 * does not read right for its country cannot have been found.
 */
export async function markIdChecked(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = idCheckedSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, kind } = parsed.data;
  const [c] = await db.select().from(contacts).where(eq(contacts.id, id));
  if (!c) return fail("This contact no longer exists.");
  const value = c[kind];
  const label = kind === "vat" ? "VAT number" : "EORI number";
  if (!value) return fail(`No ${label} on the contact yet.`);
  const problem = idProblem(value, c.country, kind, await readIdFormats());
  if (problem) return fail(problem);
  const today = officeToday();
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
      detail: { kind, value, on: today },
    });
  });
  await invalidateTags(tags.contact(id));
  revalidatePath(`/contacts/${id}`, "layout");
  return { ok: true, data: undefined, message: `${label} checked — ${value}` };
}
