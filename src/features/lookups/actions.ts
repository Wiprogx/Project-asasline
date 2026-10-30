"use server";

import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { LookupKind } from "@/domain/lookup-tables";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db, type DbOrTx } from "@/server/db/client";
import { invalidateLookups, lookupFlagKey, lookupTable } from "@/server/lookups";
import { ConflictError, updateVersioned } from "@/server/versioned";
import {
  archiveLookupSchema,
  createLookupSchema,
  restoreLookupSchema,
  updateLookupSchema,
} from "./schemas";

const LABEL = "This reason";
const TAKEN = "These words are already in the list.";
/** The yes/no column's value, for a list that has one; nothing for the others. */
const flagOf = (kind: LookupKind, flag: boolean) => {
  const key = lookupFlagKey(kind);
  return key ? { [key]: flag } : {};
};

const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && e.code === "23505";

/** Another live reason with the same words (any case); `except` is the one being saved. */
async function taken(tx: DbOrTx, kind: LookupKind, label: string, except?: string) {
  const t = lookupTable(kind);
  const [row] = await tx
    .select({ id: t.id })
    .from(t)
    .where(
      and(
        isNull(t.archivedAt),
        sql`lower(${t.label}) = lower(${label})`,
        except ? ne(t.id, except) : undefined,
      ),
    )
    .limit(1);
  return !!row;
}

async function lastPosition(tx: DbOrTx, kind: LookupKind) {
  const t = lookupTable(kind);
  const [row] = await tx
    .select({ position: t.position })
    .from(t)
    .where(isNull(t.code))
    .orderBy(desc(t.position))
    .limit(1);
  return row?.position ?? 0;
}

/** Runs the write; a refusal, a taken label or a colleague's newer save becomes the answer. */
async function settle(
  kind: LookupKind,
  message: string,
  write: () => Promise<string | void>,
): Promise<ActionResult> {
  try {
    const refused = await write();
    if (refused) return fail(refused);
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    if (isUniqueViolation(e)) return fail(TAKEN);
    throw e;
  }
  await invalidateLookups(kind);
  revalidatePath(`/settings/lists/${kind}`);
  return { ok: true, data: undefined, message };
}

export async function createLookup(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = createLookupSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { kind, label, position, flag } = parsed.data;
  const t = lookupTable(kind);
  return settle(kind, `Added · ${label}`, () =>
    db.transaction(async (tx) => {
      if (await taken(tx, kind, label)) return TAKEN;
      const [row] = await tx
        .insert(t)
        .values({
          label,
          ...flagOf(kind, flag),
          position: position ?? (await lastPosition(tx, kind)) + 10,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning({ id: t.id });
      await audit(tx, {
        action: `${kind}.create`,
        userId: user.id,
        entity: kind,
        entityId: row.id,
        detail: { label },
      });
    }),
  );
}

/** A reworded reason reads the new words on every record that names it. */
export async function updateLookup(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = updateLookupSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { kind, id, version, label, position, flag } = parsed.data;
  const t = lookupTable(kind);
  return settle(kind, "Saved", () =>
    db.transaction(async (tx) => {
      if (await taken(tx, kind, label, id)) return TAKEN;
      const [before] = await tx.select().from(t).where(eq(t.id, id));
      if (!before) throw new ConflictError(LABEL);
      const values = {
        label,
        ...flagOf(kind, flag),
        position: position ?? before.position,
        updatedBy: user.id,
      };
      await updateVersioned(tx, t, id, version, values, LABEL);
      await audit(tx, {
        action: `${kind}.update`,
        userId: user.id,
        entity: kind,
        entityId: id,
        detail: { from: before.label, to: label, position: values.position },
      });
    }),
  );
}

/** No longer offered, never deleted: the records that name it keep pointing at it. */
export async function archiveLookup(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = archiveLookupSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { kind, id, version, reason } = parsed.data;
  const t = lookupTable(kind);
  return settle(kind, "Archived — no longer offered", () =>
    db.transaction(async (tx) => {
      const [row] = await tx.select({ code: t.code }).from(t).where(eq(t.id, id));
      if (!row) throw new ConflictError(LABEL);
      if (row.code) return "The app gives this reason by itself: it can be reworded, not archived.";
      const archived = { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason };
      await updateVersioned(tx, t, id, version, { ...archived, updatedBy: user.id }, LABEL);
      await audit(tx, {
        action: `${kind}.archive`,
        userId: user.id,
        entity: kind,
        entityId: id,
        detail: { reason },
      });
    }),
  );
}

/** Offered again, unless a live reason has taken its words meanwhile. */
export async function restoreLookup(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = restoreLookupSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { kind, id, version } = parsed.data;
  const t = lookupTable(kind);
  return settle(kind, "Offered again", () =>
    db.transaction(async (tx) => {
      const [row] = await tx.select().from(t).where(eq(t.id, id));
      if (!row) throw new ConflictError(LABEL);
      if (await taken(tx, kind, row.label, id)) return TAKEN;
      const back = { archivedAt: null, archivedBy: null, archivedReason: null, updatedBy: user.id };
      await updateVersioned(tx, t, id, version, back, LABEL);
      await audit(tx, {
        action: `${kind}.restore`,
        userId: user.id,
        entity: kind,
        entityId: id,
      });
    }),
  );
}
