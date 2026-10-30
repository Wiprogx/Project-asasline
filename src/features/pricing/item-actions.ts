"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { itemProblem } from "@/domain/pricing";
import { type ActionResult, fail, formToObject, invalid, nullMissing } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { readRateCategories } from "@/server/catalogue-config";
import { readCountries } from "@/server/countries";
import { db } from "@/server/db/client";
import { liveLookupIdByLabel } from "@/server/lookups";
import { portIds } from "@/server/ports";
import { rateItems } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { archiveSchema, rateItemSchema, rateItemUpdateSchema, restoreSchema } from "./schemas";

type Fields = ReturnType<typeof rateItemSchema.parse>;

const OPTIONAL = [
  "name",
  "polId",
  "podId",
  "country",
  "containerTypeId",
  "carrier",
  "transitDays",
  "fromPlace",
  "toPlace",
  "docCode",
  "freeDays",
  "scope",
  "freeKind",
  "side",
  "validUntil",
  "note",
] as const;

async function problemOf(d: Fields): Promise<ActionResult | null> {
  const cats = await readRateCategories();
  if (!cats.some((c) => c.code === d.category)) return fail("Choose a category from the list.");
  if (d.country && !(await readCountries()).some((c) => c.code === d.country && !c.archived))
    return fail(`${d.country} is not a country of Settings › Countries.`);
  const p = itemProblem(d);
  return p ? fail(p) : null;
}

/**
 * The box code typed, as its row of Settings › Lists › Container types (none: any box), and the
 * ports typed, as their rows of Settings › Ports.
 */
async function rowOf({ containerType, pol, pod, ...rest }: Fields, userId: string) {
  const containerTypeId = containerType
    ? await liveLookupIdByLabel(db, "container-types", containerType)
    : null;
  if (containerType && !containerTypeId)
    return {
      row: null,
      problem: fail(
        `Container type "${containerType}" is not in Settings › Bookings › Container types.`,
      ),
    };
  const ports = await portIds(db, { pol, pod }, userId);
  return { row: { ...rest, ...ports, containerTypeId }, problem: null };
}

const done = (message: string, id?: string): ActionResult => {
  revalidatePath("/settings/catalogue", "layout");
  if (id) revalidatePath(`/settings/catalogue/${id}`);
  return { ok: true, data: undefined, message };
};

export async function createRateItem(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = rateItemSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const bad = await problemOf(parsed.data);
  if (bad) return bad;
  const box = await rowOf(parsed.data, user.id);
  if (box.problem) return box.problem;
  const [row] = await db
    .insert(rateItems)
    .values({ ...box.row, createdBy: user.id, updatedBy: user.id })
    .returning({ id: rateItems.id });
  await audit(db, { action: "rate.create", userId: user.id, entity: "rate", entityId: row.id });
  return done("Added to the catalogue");
}

/** A new price applies to quotations priced from now on; lines already quoted keep theirs. */
export async function updateRateItem(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = rateItemUpdateSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...rest } = parsed.data;
  const bad = await problemOf(parsed.data);
  if (bad) return bad;
  const box = await rowOf(rest, user.id);
  if (box.problem) return box.problem;
  const fields = box.row;
  try {
    await db.transaction(async (tx) => {
      await updateVersioned(
        tx,
        rateItems,
        id,
        version,
        { ...nullMissing(fields, OPTIONAL), updatedBy: user.id },
        "This item",
      );
      await audit(tx, {
        action: "rate.update",
        userId: user.id,
        entity: "rate",
        entityId: id,
        detail: { sellCents: fields.sellCents, buyCents: fields.buyCents },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  return done("Saved", id);
}

/** Out of use with a reason: no longer offered, still behind the lines that used it. */
export async function archiveRateItem(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = archiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, reason } = parsed.data;
  await db
    .update(rateItems)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(and(eq(rateItems.id, id), isNull(rateItems.archivedAt)));
  await audit(db, {
    action: "rate.archive",
    userId: user.id,
    entity: "rate",
    entityId: id,
    detail: { reason },
  });
  return done("Taken out of the catalogue", id);
}

export async function restoreRateItem(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("catalogue.edit");
  const parsed = restoreSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id } = parsed.data;
  await db
    .update(rateItems)
    .set({ archivedAt: null, archivedBy: null, archivedReason: null, updatedBy: user.id })
    .where(and(eq(rateItems.id, id), isNotNull(rateItems.archivedAt)));
  await audit(db, { action: "rate.restore", userId: user.id, entity: "rate", entityId: id });
  return done("Back in the catalogue", id);
}
