/**
 * Legacy quotations → quotations, their destinations and lines. The customer is the imported
 * contact (by its legacy id, else its name); each line's catalogue item is the imported one.
 * The QT reference is kept as issued; a quotation the app already holds by that reference is
 * linked, not added twice.
 */
import { eq, isNull } from "drizzle-orm";
import { type ImportedItem, mapLegacyQuotation } from "../../src/domain/legacy-quotations";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { itemLabel } from "../../src/domain/pricing";
import type { DbOrTx } from "../../src/server/db/client";
import {
  contacts,
  legacyLinks,
  quotationLines,
  quotationRoutes,
  quotations,
  rateItems,
} from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

async function importedItems(tx: DbOrTx): Promise<Map<string, ImportedItem>> {
  const rows = await tx
    .select({ legacyId: legacyLinks.legacyId, item: rateItems })
    .from(legacyLinks)
    .innerJoin(rateItems, eq(rateItems.id, legacyLinks.recordId))
    .where(eq(legacyLinks.kind, "RATE_ITEMS"));
  return new Map(
    rows.map(({ legacyId, item }) => [
      legacyId,
      {
        id: item.id,
        category: item.category,
        label: itemLabel(item),
        vatCode: item.vatCode,
        pol: item.pol,
        pod: item.pod,
        containerType: item.containerType,
      },
    ]),
  );
}

async function contactByName(tx: DbOrTx) {
  const rows = await tx
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(isNull(contacts.archivedAt));
  return new Map(rows.map((r) => [r.name.trim().toLowerCase(), r.id]));
}

const ARCHIVED = "Archived in the legacy office";

export async function importQuotations(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "quotations");
  const contactLinks = await linksOf(tx, "contacts");
  const byName = await contactByName(tx);
  const items = await importedItems(tx);
  for (const rec of records.filter((r) => r.kind === "quotations")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyQuotation(rec.body, (id) => items.get(id));
    if (!m) {
      report.skipped.push(`quotation ${rec.id}: no reference`);
      continue;
    }
    const b = rec.body;
    const clientId =
      contactLinks.get(String(b.clientId ?? "")) ??
      byName.get(
        String(b.client ?? "")
          .trim()
          .toLowerCase(),
      );
    if (!clientId) {
      report.skipped.push(`${m.quotation.ref}: customer "${String(b.client ?? "?")}" not found`);
      continue;
    }
    for (const w of m.warnings) report.warnings.push(`${m.quotation.ref}: ${w}`);
    const [known] = await tx
      .select({ id: quotations.id })
      .from(quotations)
      .where(eq(quotations.ref, m.quotation.ref));
    let id = known?.id;
    if (id) report.matched++;
    else {
      const archived = rec.archived ? { archivedAt: new Date(), archivedReason: ARCHIVED } : {};
      [{ id }] = await tx
        .insert(quotations)
        .values({ ...m.quotation, clientId, ...archived })
        .returning({ id: quotations.id });
      for (const r of m.routes) {
        const [route] = await tx
          .insert(quotationRoutes)
          .values({ ...r.route, quotationId: id })
          .returning({ id: quotationRoutes.id });
        if (r.lines.length)
          await tx.insert(quotationLines).values(r.lines.map((l) => ({ ...l, routeId: route.id })));
      }
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "quotations", legacyId: rec.id, recordId: id });
    links.set(rec.id, id);
  }
  return report;
}
