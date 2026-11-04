"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { contacts, rateItems } from "@/server/db/schema";
import { duplicateRateItemSchema } from "./duplicate-schema";

type Row = typeof rateItems.$inferSelect;

/** The record's own columns: a copy is a new record with its own history, never these. */
const RECORD = [
  "id",
  "version",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "archivedAt",
  "archivedBy",
  "archivedReason",
] as const;

/** Everything that identifies and prices an item — ports, box, places, VAT, validity, note… */
const fieldsOf = (row: Row) =>
  Object.fromEntries(
    Object.entries(row).filter(([k]) => !(RECORD as readonly string[]).includes(k)),
  ) as Omit<Row, (typeof RECORD)[number]>;

/**
 * A copy of a catalogue item (legacy: the same destination with two carriers is two rate
 * items): every column of the original but its record columns, with the carrier, the prices
 * and the rate source given in the dialog. The original is untouched; the copy is a new row.
 */
export async function duplicateRateItem(
  _p: ActionResult<{ id: string }>,
  fd: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("catalogue.edit");
  const parsed = duplicateRateItemSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, carrierId, sellCents, buyCents, rateType } = parsed.data;
  const [source] = await db.select().from(rateItems).where(eq(rateItems.id, id));
  if (!source) return fail("This catalogue item no longer exists.");
  if (carrierId) {
    const [c] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, carrierId), isNull(contacts.archivedAt)));
    if (!c) return fail("Pick the carrier from the contacts.");
  }
  const [row] = await db
    .insert(rateItems)
    .values({
      ...fieldsOf(source),
      carrierId,
      sellCents,
      buyCents,
      rateType,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: rateItems.id });
  await audit(db, {
    action: "rate.create",
    userId: user.id,
    entity: "rate",
    entityId: row.id,
    detail: { copiedFrom: id },
  });
  revalidatePath("/settings/catalogue", "layout");
  return { ok: true, data: { id: row.id }, message: "Copied — this is the new item" };
}
