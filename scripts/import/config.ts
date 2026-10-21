/**
 * The legacy settings (records of kind "config"): the word lists into their Settings row, the
 * rate catalogue into rate_items. A list the app already holds is kept — Settings may have been
 * edited since — and reported; an item already in the catalogue is linked, not added twice.
 */
import { and, eq, isNull } from "drizzle-orm";
import {
  configValueOf,
  LEGACY_LISTS,
  type LegacyListName,
  listOf,
} from "../../src/domain/legacy-config";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { mapRateItem, type RateItemRow } from "../../src/domain/legacy-rates";
import type { DbOrTx } from "../../src/server/db/client";
import { configTables, legacyLinks, rateItems } from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

const configOf = (records: readonly LegacyRecord[], id: string) =>
  records.find((r) => r.kind === "config" && r.id === id);

export async function importLists(tx: DbOrTx, records: readonly LegacyRecord[]) {
  const report = emptyReport();
  for (const [legacy, name] of Object.entries(LEGACY_LISTS)) {
    const rec = configOf(records, legacy);
    if (!rec) continue;
    const words = listOf(configValueOf(rec.body), legacy as LegacyListName);
    if (!words) {
      report.skipped.push(`${legacy}: not a list of words`);
      continue;
    }
    const [has] = await tx
      .select({ name: configTables.name })
      .from(configTables)
      .where(eq(configTables.name, name));
    if (has) {
      report.already++;
      report.warnings.push(`${legacy}: Settings › ${name} already saved in the app — kept`);
      continue;
    }
    await tx.insert(configTables).values({ name, value: words });
    report.added++;
  }
  return report;
}

/** The same item already in the catalogue: same category and the fields that name it. */
async function sameItem(tx: DbOrTx, r: RateItemRow) {
  const eqOrNull = <T>(col: Parameters<typeof eq>[0], v: T | null) =>
    v === null ? isNull(col) : eq(col, v);
  const [row] = await tx
    .select({ id: rateItems.id })
    .from(rateItems)
    .where(
      and(
        isNull(rateItems.archivedAt),
        eq(rateItems.category, r.category),
        eqOrNull(rateItems.name, r.name),
        eqOrNull(rateItems.pol, r.pol),
        eqOrNull(rateItems.pod, r.pod),
        eqOrNull(rateItems.carrier, r.carrier),
        eqOrNull(rateItems.containerType, r.containerType),
        eqOrNull(rateItems.docCode, r.docCode),
        eqOrNull(rateItems.country, r.country),
        eqOrNull(rateItems.fromPlace, r.fromPlace),
        eqOrNull(rateItems.toPlace, r.toPlace),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

export async function importRates(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const rec = configOf(records, "RATE_ITEMS");
  const value = rec ? configValueOf(rec.body) : null;
  if (!Array.isArray(value)) return report;
  const links = await linksOf(tx, "RATE_ITEMS");
  for (const raw of value) {
    const it = (raw ?? {}) as Record<string, unknown>;
    const legacyId = String(it.id ?? "");
    if (!legacyId) {
      report.skipped.push("a catalogue item without an id");
      continue;
    }
    if (links.has(legacyId)) {
      report.already++;
      continue;
    }
    const mapped = mapRateItem(it);
    if (!mapped) {
      report.skipped.push(`item ${legacyId}: no category`);
      continue;
    }
    for (const w of mapped.warnings) report.warnings.push(`item ${legacyId}: ${w}`);
    let id = await sameItem(tx, mapped.row);
    if (id) report.matched++;
    else {
      [{ id }] = await tx.insert(rateItems).values(mapped.row).returning({ id: rateItems.id });
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "RATE_ITEMS", legacyId, recordId: id! });
    links.set(legacyId, id!);
  }
  return report;
}
