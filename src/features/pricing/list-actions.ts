"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fail, formToObject, invalid, nullMissing } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { priceListLines, priceLists, rateItems } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { overlappingList } from "./list-store";
import {
  agreedPriceArchiveSchema,
  agreedPriceSchema,
  archiveSchema,
  priceListSchema,
  priceListUpdateSchema,
} from "./schemas";

const refresh = (id: string, contactId?: string) => {
  revalidatePath("/settings/price-lists", "layout");
  revalidatePath(`/settings/price-lists/${id}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
};

const periodProblem = (d: { validFrom: string | null; validUntil: string | null }) =>
  d.validFrom && d.validUntil && d.validUntil < d.validFrom
    ? {
        ok: false as const,
        error: "It ends before it starts.",
        fieldErrors: { validUntil: ["After the start"] },
      }
    : null;

export async function createPriceList(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = priceListSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const bad = periodProblem(d) ?? (await overlappingList(db, d));
  if (bad) return bad;
  const [row] = await db
    .insert(priceLists)
    .values({ ...d, createdBy: user.id, updatedBy: user.id })
    .returning({ id: priceLists.id });
  await audit(db, {
    action: "pricelist.create",
    userId: user.id,
    entity: "pricelist",
    entityId: row.id,
    detail: { contactId: d.contactId },
  });
  refresh(row.id, d.contactId);
  redirect(`/settings/price-lists/${row.id}`);
}

export async function updatePriceList(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = priceListUpdateSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  const bad = periodProblem(fields) ?? (await overlappingList(db, { ...fields, exceptId: id }));
  if (bad) return bad;
  try {
    await db.transaction(async (tx) => {
      await updateVersioned(
        tx,
        priceLists,
        id,
        version,
        { ...nullMissing(fields, ["validFrom", "validUntil"]), updatedBy: user.id },
        "This agreement",
      );
      await audit(tx, {
        action: "pricelist.update",
        userId: user.id,
        entity: "pricelist",
        entityId: id,
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  refresh(id, fields.contactId);
  return { ok: true, data: undefined, message: "Saved" };
}

/** Withdrawn with a reason: quotations fall back to the catalogue, the record stays. */
export async function archivePriceList(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = archiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, reason } = parsed.data;
  const [row] = await db
    .update(priceLists)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason, active: false })
    .where(and(eq(priceLists.id, id), isNull(priceLists.archivedAt)))
    .returning({ contactId: priceLists.contactId });
  await audit(db, {
    action: "pricelist.archive",
    userId: user.id,
    entity: "pricelist",
    entityId: id,
    detail: { reason },
  });
  refresh(id, row?.contactId);
  return { ok: true, data: undefined, message: "Agreement withdrawn" };
}

/**
 * Adds an item to the agreement, or changes its agreed price. An empty price takes the
 * catalogue's. A changed price archives the old line, so what was agreed before stays readable.
 */
export async function setAgreedPrice(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = agreedPriceSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const r = await db.transaction(async (tx) => {
    const [list] = await tx
      .select()
      .from(priceLists)
      .where(eq(priceLists.id, d.priceListId))
      .for("update");
    if (!list || list.archivedAt) return fail("This agreement was withdrawn.");
    const [item] = await tx.select().from(rateItems).where(eq(rateItems.id, d.itemId));
    if (!item || item.archivedAt) return fail("That item is no longer in the catalogue.");
    const live = and(
      eq(priceListLines.priceListId, list.id),
      eq(priceListLines.itemId, item.id),
      isNull(priceListLines.archivedAt),
    );
    await tx
      .update(priceListLines)
      .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: "Price changed" })
      .where(live);
    await tx.insert(priceListLines).values({
      priceListId: list.id,
      itemId: item.id,
      sellCents: d.sellCents ?? item.sellCents,
      buyCents: d.buyCents ?? item.buyCents,
      createdBy: user.id,
      updatedBy: user.id,
    });
    await audit(tx, {
      action: "pricelist.price",
      userId: user.id,
      entity: "pricelist",
      entityId: list.id,
      detail: { itemId: item.id, sellCents: d.sellCents ?? item.sellCents },
    });
    return list.contactId;
  });
  if (typeof r !== "string") return r;
  refresh(d.priceListId, r);
  return { ok: true, data: undefined, message: "Agreed price saved" };
}

export async function removeAgreedPrice(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = agreedPriceArchiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, priceListId, reason } = parsed.data;
  await db
    .update(priceListLines)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(and(eq(priceListLines.id, id), eq(priceListLines.priceListId, priceListId)));
  await audit(db, {
    action: "pricelist.price.remove",
    userId: user.id,
    entity: "pricelist",
    entityId: priceListId,
    detail: { line: id, reason },
  });
  refresh(priceListId);
  return { ok: true, data: undefined, message: "Removed — the catalogue price applies again" };
}
