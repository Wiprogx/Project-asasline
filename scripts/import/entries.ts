/**
 * Legacy entries written by hand → journal entries, a cancelled one with its reversal. An
 * opening entry is carried only while the app holds no opening balance (the Odoo cut-over
 * would count it twice). The legacy reference is kept; it never collides with OD/YYYY/NNNNN.
 */
import { eq } from "drizzle-orm";
import { reversalOf } from "../../src/domain/journal-entries";
import { mapLegacyEntry } from "../../src/domain/legacy-entries";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import type { DbOrTx } from "../../src/server/db/client";
import { journalEntries, legacyLinks, openingBalances } from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

export async function importEntries(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "entries");
  const [opening] = await tx.select({ id: openingBalances.id }).from(openingBalances).limit(1);
  for (const rec of records.filter((r) => r.kind === "entries")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    // Entries the legacy app derived from a document or a payment are derived again here.
    if (rec.body.src && typeof rec.body.src === "object") continue;
    const m = mapLegacyEntry(rec.body);
    if ("skip" in m) {
      report.skipped.push(`entry ${rec.id}: ${m.skip}`);
      continue;
    }
    if (m.opening && opening) {
      report.skipped.push(
        `${m.entry.ref}: an opening entry, and the app already holds its opening`,
      );
      continue;
    }
    const [known] = await tx
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(eq(journalEntries.ref, m.entry.ref));
    let id = known?.id;
    if (id) report.matched++;
    else {
      [{ id }] = await tx
        .insert(journalEntries)
        .values(m.entry)
        .returning({ id: journalEntries.id });
      if (m.reversedOn)
        await tx.insert(journalEntries).values({
          ref: `${m.entry.ref}-R`,
          date: m.reversedOn,
          label: `Reversed · ${m.entry.ref} — cancelled in the legacy office`,
          lines: reversalOf(m.entry.lines),
          reversalOf: id,
        });
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "entries", legacyId: rec.id, recordId: id! });
    links.set(rec.id, id!);
  }
  return report;
}
