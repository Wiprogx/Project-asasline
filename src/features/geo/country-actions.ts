"use server";

import { eq } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { countries } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { archiveSchema, createCountrySchema, restoreSchema, updateCountrySchema } from "./schemas";
import { settleGeo } from "./settle";

const LABEL = "This country";

/** A country ISO does not list yet (a code of its own): a row, offered from now on. */
export async function createCountry(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = createCountrySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;
  return settleGeo(`Added · ${c.name} (${c.code})`, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .insert(countries)
        .values({ ...c, createdBy: user.id, updatedBy: user.id })
        .returning({ id: countries.id });
      await audit(tx, {
        action: "country.create",
        userId: user.id,
        entity: "country",
        entityId: row.id,
        detail: { code: c.code },
      });
    }),
  );
}

/** Its code stays; every contact of the country reads the new name, dial code and language. */
export async function updateCountry(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = updateCountrySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  return settleGeo("Saved", () =>
    db.transaction(async (tx) => {
      const [before] = await tx.select().from(countries).where(eq(countries.id, id));
      if (!before) throw new ConflictError(LABEL);
      await updateVersioned(tx, countries, id, version, { ...fields, updatedBy: user.id }, LABEL);
      await audit(tx, {
        action: "country.update",
        userId: user.id,
        entity: "country",
        entityId: id,
        detail: { code: before.code, from: before.name, to: fields.name },
      });
    }),
  );
}

/** No longer offered on the country fields, never deleted: its contacts keep it. */
export async function archiveCountry(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = archiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  return settleGeo("Archived — no longer offered", () =>
    db.transaction(async (tx) => {
      const archived = { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason };
      await updateVersioned(tx, countries, id, version, { ...archived, updatedBy: user.id }, LABEL);
      await audit(tx, {
        action: "country.archive",
        userId: user.id,
        entity: "country",
        entityId: id,
        detail: { reason },
      });
    }),
  );
}

export async function restoreCountry(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = restoreSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;
  return settleGeo("Offered again", () =>
    db.transaction(async (tx) => {
      const back = { archivedAt: null, archivedBy: null, archivedReason: null, updatedBy: user.id };
      await updateVersioned(tx, countries, id, version, back, LABEL);
      await audit(tx, {
        action: "country.restore",
        userId: user.id,
        entity: "country",
        entityId: id,
      });
    }),
  );
}
