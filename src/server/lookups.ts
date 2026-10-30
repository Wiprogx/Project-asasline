import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { HIDDEN_CODED, type LookupKind, type WithdrawCode } from "@/domain/lookup-tables";
import { cached, invalidateTags, tags } from "./cache/cache";
import { db, type DbOrTx } from "./db/client";
import * as schema from "./db/schema";

export type LookupOption = { value: string; label: string; code?: string | null };

/** Every list table has the same columns (schema/lists listTable); each is read as one. */
type LookupTable = typeof schema.cancelReasons;
const TABLES: Record<LookupKind, LookupTable> = {
  "cancel-reasons": schema.cancelReasons,
  "withdraw-reasons": schema.withdrawReasons as unknown as LookupTable,
  salutations: schema.salutations as unknown as LookupTable,
  "doc-types": schema.docTypes as unknown as LookupTable,
  "task-types": schema.taskTypes as unknown as LookupTable,
  "package-types": schema.packageTypes as unknown as LookupTable,
  "seal-sources": schema.sealSources as unknown as LookupTable,
  "person-roles": schema.personRoles as unknown as LookupTable,
  "location-roles": schema.locationRoles as unknown as LookupTable,
  "contact-doc-kinds": schema.contactDocKinds as unknown as LookupTable,
  professions: schema.professions as unknown as LookupTable,
  "contact-tags": schema.tagList as unknown as LookupTable,
  "container-types": schema.containerTypes as unknown as LookupTable,
  "port-regions": schema.portRegions as unknown as LookupTable,
};

export const lookupTable = (kind: LookupKind) => TABLES[kind];

/** A list's one yes/no column, when it has one (a document type travels on paper). */
const FLAGS: Partial<Record<LookupKind, string>> = { "doc-types": "onPaper" };

export const lookupFlagKey = (kind: LookupKind) => FLAGS[kind] ?? null;

export function lookupFlagColumn(kind: LookupKind): PgColumn | null {
  const key = FLAGS[kind];
  return key ? (TABLES[kind] as unknown as Record<string, PgColumn>)[key] : null;
}

/** Offered to a person: live, and — in a list of the app's own reasons — not a coded one. */
const offered = (kind: LookupKind, t: LookupTable) =>
  HIDDEN_CODED.includes(kind) ? and(isNull(t.archivedAt), isNull(t.code)) : isNull(t.archivedAt);

/** The rows a picker offers, in their order. */
export function liveLookups(kind: LookupKind): Promise<LookupOption[]> {
  const t = TABLES[kind];
  return cached(`lookups:${kind}:live`, { ttlSeconds: 600, tags: [tags.lookups(kind)] }, () =>
    db
      .select({ value: t.id, label: t.label, code: t.code })
      .from(t)
      .where(offered(kind, t))
      .orderBy(asc(t.position), asc(t.label)),
  );
}

/**
 * The offered rows, plus the record's own when it is no longer offered (archived), so a save of
 * the form keeps it instead of clearing it.
 */
export async function lookupOptions(
  kind: LookupKind,
  keep?: string | null,
): Promise<LookupOption[]> {
  const live = await liveLookups(kind);
  if (!keep || live.some((o) => o.value === keep)) return live;
  const t = TABLES[kind];
  const [row] = await db.select({ value: t.id, label: t.label }).from(t).where(eq(t.id, keep));
  return row ? [...live, { value: row.value, label: `${row.label} (archived)` }] : live;
}

/** The label of a row a person may pick; null for an unknown, archived or coded one. */
export async function liveLookupLabel(
  tx: DbOrTx,
  kind: LookupKind,
  id: string,
): Promise<string | null> {
  const t = TABLES[kind];
  const [row] = await tx
    .select({ label: t.label })
    .from(t)
    .where(and(eq(t.id, id), offered(kind, t)));
  return row?.label ?? null;
}

/** Every row's words by id, archived ones too (a record keeps pointing at its row). */
export async function lookupLabels(kind: LookupKind): Promise<Map<string, string>> {
  const t = TABLES[kind];
  const rows = await cached(
    `lookups:${kind}:labels`,
    { ttlSeconds: 600, tags: [tags.lookups(kind)] },
    () => db.select({ id: t.id, label: t.label }).from(t),
  );
  return new Map(rows.map((r) => [r.id, r.label]));
}

/**
 * Rows with the words of one of their list columns added under `as` — a rate item's box code
 * as `containerType`, a container's as `type` — so the domain reads them as it always has.
 */
export async function withLabel<T extends object, K extends string>(
  rows: readonly T[],
  kind: LookupKind,
  idKey: keyof T,
  as: K,
): Promise<(T & Record<K, string | null>)[]> {
  const labels = await lookupLabels(kind);
  return rows.map((r) => {
    const id = r[idKey] as unknown as string | null;
    return { ...r, [as]: id ? (labels.get(id) ?? null) : null } as T & Record<K, string | null>;
  });
}

/** The row the app relies on by its code (e.g. the document a new booking starts with). */
export async function lookupIdByCode(tx: DbOrTx, kind: LookupKind, code: string) {
  const t = TABLES[kind];
  const [row] = await tx.select({ id: t.id }).from(t).where(eq(t.code, code));
  if (!row) throw new Error(`${kind}: no row coded "${code}"`);
  return row.id;
}

/** A live row by its words (any case), else the coded fallback — a rule names a task type. */
export async function lookupIdByLabel(tx: DbOrTx, kind: LookupKind, label: string, code: string) {
  const t = TABLES[kind];
  const [row] = await tx
    .select({ id: t.id })
    .from(t)
    .where(and(isNull(t.archivedAt), sql`lower(${t.label}) = lower(${label})`));
  return row?.id ?? lookupIdByCode(tx, kind, code);
}

/** A live row by its words (any case), or null. */
export async function liveLookupIdByLabel(tx: DbOrTx, kind: LookupKind, label: string) {
  const t = TABLES[kind];
  const [row] = await tx
    .select({ id: t.id })
    .from(t)
    .where(and(isNull(t.archivedAt), sql`lower(${t.label}) = lower(${label})`));
  return row?.id ?? null;
}

/** A live row with these words (any case), added at the end of the list when there is none. */
export async function ensureLookup(tx: DbOrTx, kind: LookupKind, label: string) {
  const t = TABLES[kind];
  const [row] = await tx
    .select({ id: t.id })
    .from(t)
    .where(and(isNull(t.archivedAt), sql`lower(${t.label}) = lower(${label})`));
  if (row) return row.id;
  const [last] = await tx
    .select({ position: sql<number>`coalesce(max(${t.position}), 0)` })
    .from(t);
  const [made] = await tx
    .insert(t)
    .values({ label, position: Number(last?.position ?? 0) + 10 })
    .returning({ id: t.id });
  return made.id;
}

/** The withdraw reasons the app gives by itself, by code (made by migration 0054). */
export async function withdrawReasonIds(tx: DbOrTx): Promise<Record<WithdrawCode, string>> {
  const rows = await tx
    .select({ id: schema.withdrawReasons.id, code: schema.withdrawReasons.code })
    .from(schema.withdrawReasons);
  const ids = Object.fromEntries(rows.filter((r) => r.code).map((r) => [r.code, r.id]));
  return ids as Record<WithdrawCode, string>;
}

/** After a write to a list table: the pickers read it again. */
export const invalidateLookups = (kind: LookupKind) => invalidateTags(tags.lookups(kind));
