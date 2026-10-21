/**
 * The vessel register (legacy VESSELS setting) and the customers' price agreements (legacy
 * PRICE_LISTS records). A sailing the app already holds (same vessel and voyage) is linked; an
 * agreement whose customer is not found is skipped and said.
 */
import { and, eq, isNull } from "drizzle-orm";
import { configValueOf } from "../../src/domain/legacy-config";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { mapLegacyPriceList, mapLegacyVessel } from "../../src/domain/legacy-registers";
import type { DbOrTx } from "../../src/server/db/client";
import {
  contacts,
  legacyLinks,
  priceListLines,
  priceLists,
  vessels,
} from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

export async function importVessels(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const rec = records.find((r) => r.kind === "config" && r.id === "VESSELS");
  const value = rec ? configValueOf(rec.body) : null;
  if (!Array.isArray(value)) return report;
  const links = await linksOf(tx, "VESSELS");
  for (const raw of value as Record<string, unknown>[]) {
    const legacyId = String(raw?.id ?? "");
    if (!legacyId || links.has(legacyId)) {
      if (legacyId) report.already++;
      continue;
    }
    const v = mapLegacyVessel(raw ?? {});
    if (!v) {
      report.skipped.push(`vessel ${legacyId}: no name or voyage`);
      continue;
    }
    const [known] = await tx
      .select({ id: vessels.id })
      .from(vessels)
      .where(
        and(eq(vessels.name, v.name), eq(vessels.voyage, v.voyage), isNull(vessels.archivedAt)),
      );
    let id = known?.id;
    if (id) report.matched++;
    else {
      [{ id }] = await tx.insert(vessels).values(v).returning({ id: vessels.id });
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "VESSELS", legacyId, recordId: id! });
    links.set(legacyId, id!);
  }
  return report;
}

export async function importPriceLists(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "PRICE_LISTS");
  const contactLinks = await linksOf(tx, "contacts");
  const items = await linksOf(tx, "RATE_ITEMS");
  const named = new Map(
    (await tx.select({ id: contacts.id, name: contacts.name }).from(contacts)).map((c) => [
      c.name.trim().toLowerCase(),
      c.id,
    ]),
  );
  for (const rec of records.filter((r) => r.kind === "PRICE_LISTS")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyPriceList(rec.body, (id) => items.get(id));
    if (!m) {
      report.skipped.push(`price list ${rec.id}: no name`);
      continue;
    }
    const contactId =
      contactLinks.get(String(m.contact.legacyId ?? "")) ??
      named.get((m.contact.name ?? "").toLowerCase());
    if (!contactId) {
      report.skipped.push(`"${m.list.name}": customer "${m.contact.name ?? "?"}" not found`);
      continue;
    }
    for (const w of m.warnings) report.warnings.push(`"${m.list.name}": ${w}`);
    const [list] = await tx
      .insert(priceLists)
      .values({ ...m.list, contactId, active: m.list.active && !rec.archived })
      .returning({ id: priceLists.id });
    if (m.lines.length)
      await tx.insert(priceListLines).values(m.lines.map((l) => ({ ...l, priceListId: list.id })));
    report.added++;
    await tx
      .insert(legacyLinks)
      .values({ kind: "PRICE_LISTS", legacyId: rec.id, recordId: list.id });
    links.set(rec.id, list.id);
  }
  return report;
}
