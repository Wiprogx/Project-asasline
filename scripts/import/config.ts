/**
 * The legacy settings (records of kind "config"): the rate catalogue into rate_items (the word
 * lists go to their tables, scripts/import/lookups); an item already in the catalogue is linked,
 * not added twice.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { configValueOf } from "../../src/domain/legacy-config";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { mapRateItem, type RateItemRow } from "../../src/domain/legacy-rates";
import type { DbOrTx } from "../../src/server/db/client";
import { contacts, legacyLinks, rateItems } from "../../src/server/db/schema";
import { ensureLookup } from "../../src/server/lookups";
import { linksOf } from "./contacts";
import { importPortId } from "./ports";
import { emptyReport, type KindReport } from "./report";

const configOf = (records: readonly LegacyRecord[], id: string) =>
  records.find((r) => r.kind === "config" && r.id === id);

/** The same item already in the catalogue: same category and the fields that name it. */
type ResolvedItem = Omit<RateItemRow, "pol" | "pod" | "containerType" | "carrier"> & {
  containerTypeId: string | null;
  polId: string | null;
  podId: string | null;
  carrierId: string | null;
};

/** The legacy carrier words as the live contact of that name; none found: left off, said. */
async function carrierIdFor(tx: DbOrTx, words: string | null, warn: (w: string) => void) {
  if (!words?.trim()) return null;
  const [c] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(isNull(contacts.archivedAt), sql`lower(${contacts.name}) = lower(${words.trim()})`))
    .limit(1);
  if (!c) warn(`carrier "${words}" is no contact — left off`);
  return c?.id ?? null;
}

async function sameItem(tx: DbOrTx, r: ResolvedItem) {
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
        eqOrNull(rateItems.polId, r.polId),
        eqOrNull(rateItems.podId, r.podId),
        eqOrNull(rateItems.carrierId, r.carrierId),
        eqOrNull(rateItems.containerTypeId, r.containerTypeId),
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
    // The box code is a row of Settings › Lists › Container types (a code in use is offered),
    // and the ports rows of Settings › Ports.
    const { containerType, pol, pod, carrier, ...fields } = mapped.row;
    const warn = (w: string) => report.warnings.push(`item ${legacyId}: ${w}`);
    const row = {
      ...fields,
      carrierId: await carrierIdFor(tx, carrier, warn),
      containerTypeId: containerType
        ? await ensureLookup(tx, "container-types", containerType)
        : null,
      polId: await importPortId(tx, pol, warn),
      podId: await importPortId(tx, pod, warn),
    };
    let id = await sameItem(tx, row);
    if (id) report.matched++;
    else {
      [{ id }] = await tx.insert(rateItems).values(row).returning({ id: rateItems.id });
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "RATE_ITEMS", legacyId, recordId: id! });
    links.set(legacyId, id!);
  }
  return report;
}
