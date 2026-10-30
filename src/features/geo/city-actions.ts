"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { citySearchKey } from "@/domain/cities";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { cities, contactAddresses, contacts } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import {
  archiveSchema,
  createCitySchema,
  mergeCitySchema,
  restoreSchema,
  updateCitySchema,
} from "./schemas";
import { settleGeo } from "./settle";

const LABEL = "This city";

/** A city the list lacks (a village, a new district): a row of its country, picked from now on. */
export async function createCity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = createCitySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;
  return settleGeo(`Added · ${c.name}`, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .insert(cities)
        .values({ ...c, searchKey: citySearchKey(c), createdBy: user.id, updatedBy: user.id })
        .returning({ id: cities.id });
      await audit(tx, {
        action: "city.create",
        userId: user.id,
        entity: "city",
        entityId: row.id,
        detail: { country: c.country, name: c.name },
      });
    }),
  );
}

/** Renamed or completed: every contact of the city reads the new words. */
export async function updateCity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = updateCitySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  return settleGeo("Saved", () =>
    db.transaction(async (tx) => {
      const [before] = await tx.select().from(cities).where(eq(cities.id, id));
      if (!before) throw new ConflictError(LABEL);
      const values = { ...fields, searchKey: citySearchKey(fields), updatedBy: user.id };
      await updateVersioned(tx, cities, id, version, values, LABEL);
      await audit(tx, {
        action: "city.update",
        userId: user.id,
        entity: "city",
        entityId: id,
        detail: { from: before.name, to: fields.name },
      });
    }),
  );
}

/** No longer offered on the city fields, never deleted: its contacts keep it. */
export async function archiveCity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = archiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  return settleGeo("Archived — no longer offered", () =>
    db.transaction(async (tx) => {
      const archived = { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason };
      await updateVersioned(tx, cities, id, version, { ...archived, updatedBy: user.id }, LABEL);
      await audit(tx, {
        action: "city.archive",
        userId: user.id,
        entity: "city",
        entityId: id,
        detail: { reason },
      });
    }),
  );
}

export async function restoreCity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = restoreSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;
  return settleGeo("Offered again", () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .select({ into: cities.mergedIntoId })
        .from(cities)
        .where(eq(cities.id, id));
      if (row?.into) return "A merged city stays merged: its contacts are on the other city now.";
      const back = { archivedAt: null, archivedBy: null, archivedReason: null, updatedBy: user.id };
      await updateVersioned(tx, cities, id, version, back, LABEL);
      await audit(tx, { action: "city.restore", userId: user.id, entity: "city", entityId: id });
    }),
  );
}

/**
 * A city typed wrong ("Mersn") merged into the right one of its country: every contact and
 * address on it moves there, and it is archived, remembering where they went.
 */
export async function mergeCity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = mergeCitySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, intoId } = parsed.data;
  return settleGeo("Merged — its contacts moved", () =>
    db.transaction(async (tx) => {
      const [from] = await tx.select().from(cities).where(eq(cities.id, id));
      const [into] = await tx.select().from(cities).where(eq(cities.id, intoId));
      if (!from || !into) throw new ConflictError(LABEL);
      if (from.id === into.id) return "Pick another city to merge into.";
      if (from.country !== into.country || into.archivedAt)
        return "Merge into a live city of the same country.";
      // A colleague's open edit of a moved contact meets a conflict, never writes the old city back.
      const by = { cityId: into.id, updatedBy: user.id, updatedAt: new Date() };
      const moved = await tx
        .update(contacts)
        .set({ ...by, version: sql`${contacts.version} + 1` })
        .where(eq(contacts.cityId, from.id))
        .returning({ id: contacts.id });
      await tx
        .update(contactAddresses)
        .set({ ...by, version: sql`${contactAddresses.version} + 1` })
        .where(and(eq(contactAddresses.cityId, from.id), isNull(contactAddresses.archivedAt)));
      const reason = `Merged into ${into.name}`;
      const archived = { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason };
      await updateVersioned(
        tx,
        cities,
        id,
        version,
        { ...archived, mergedIntoId: into.id, updatedBy: user.id },
        LABEL,
      );
      await audit(tx, {
        action: "city.merge",
        userId: user.id,
        entity: "city",
        entityId: id,
        detail: { from: from.name, into: into.name, intoId: into.id, contacts: moved.length },
      });
    }),
  );
}
