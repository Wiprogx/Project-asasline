/**
 * The legacy reason lists (CANCEL_REASONS, WITHDRAW_REASONS) into their Settings tables, and the
 * reason a cancelled quotation or booking, or a withdrawn task, gave resolved to its row. A
 * reason the app already holds (same words, any case) is kept as it is; one a record names that
 * is no longer offered is added archived, so the record still points at its words without the
 * pickers offering them again.
 */
import { asc, desc, isNull, sql } from "drizzle-orm";
import { configValueOf, listOf } from "../../src/domain/legacy-config";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import type { LookupKind } from "../../src/domain/lookup-tables";
import type { DbOrTx } from "../../src/server/db/client";
import * as schema from "../../src/server/db/schema";
import { emptyReport } from "./report";

/** Every list table has the same columns (schema/lists listTable). */
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
export const LEGACY_LOOKUP_LISTS: Record<string, LookupKind> = {
  CANCEL_REASONS: "cancel-reasons",
  WITHDRAW_REASONS: "withdraw-reasons",
  DOC_TYPES: "doc-types",
  ACTIVITY_TYPES: "task-types",
  PACKAGE_TYPES: "package-types",
  SEAL_SOURCES: "seal-sources",
  CHILD_TYPES: "location-roles",
  PROFESSIONS: "professions",
  CONTAINER_TYPES: "container-types",
};

async function rowFor(tx: DbOrTx, kind: LookupKind, label: string) {
  const t = TABLES[kind];
  const [row] = await tx
    .select({ id: t.id })
    .from(t)
    .where(sql`lower(${t.label}) = lower(${label})`)
    // A live row before an archived one with the same words.
    .orderBy(sql`${t.archivedAt} is not null`, asc(t.createdAt))
    .limit(1);
  return row?.id ?? null;
}

async function nextPosition(tx: DbOrTx, kind: LookupKind) {
  const t = TABLES[kind];
  const [last] = await tx
    .select({ position: t.position })
    .from(t)
    .where(isNull(t.code))
    .orderBy(desc(t.position))
    .limit(1);
  return (last?.position ?? 0) + 10;
}

export async function importLookups(tx: DbOrTx, records: readonly LegacyRecord[]) {
  const report = emptyReport();
  for (const [legacy, kind] of Object.entries(LEGACY_LOOKUP_LISTS)) {
    const rec = records.find((r) => r.kind === "config" && r.id === legacy);
    if (!rec) continue;
    const words = listOf(configValueOf(rec.body), legacy);
    if (!words) {
      report.skipped.push(`${legacy}: not a list of words`);
      continue;
    }
    for (const label of words) {
      if (await rowFor(tx, kind, label)) {
        report.already++;
        continue;
      }
      await tx.insert(TABLES[kind]).values({ label, position: await nextPosition(tx, kind) });
      report.added++;
    }
  }
  return report;
}

/** The row for the words a record gave; added archived when no row has them. */
export async function lookupIdFor(tx: DbOrTx, kind: LookupKind, label: string | null) {
  if (!label) return null;
  const known = await rowFor(tx, kind, label);
  if (known) return known;
  const t = TABLES[kind];
  const [made] = await tx
    .insert(t)
    .values({
      label,
      position: await nextPosition(tx, kind),
      archivedAt: new Date(),
      archivedReason: "Named by an imported record, not in the office's list",
    })
    .returning({ id: t.id });
  return made.id;
}
