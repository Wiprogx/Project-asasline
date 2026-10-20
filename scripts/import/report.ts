/** What one import run did, kind by kind: printed before anything is kept. */
export type KindReport = {
  added: number;
  /** Already in the new app (a same VAT number or name): linked, not added again. */
  matched: number;
  /** Imported by an earlier run (legacy_links): left alone. */
  already: number;
  skipped: string[];
  warnings: string[];
};

export const emptyReport = (): KindReport => ({
  added: 0,
  matched: 0,
  already: 0,
  skipped: [],
  warnings: [],
});

export function printReport(kind: string, r: KindReport, verbose: boolean) {
  console.log(
    `\n${kind}: ${r.added} added · ${r.matched} matched to an existing record · ${r.already} imported before · ${r.skipped.length} skipped`,
  );
  const show = (title: string, lines: string[]) => {
    if (!lines.length) return;
    console.log(`  ${title} (${lines.length}):`);
    for (const l of verbose ? lines : lines.slice(0, 15)) console.log(`    - ${l}`);
    if (!verbose && lines.length > 15) console.log(`    … ${lines.length - 15} more (--verbose)`);
  };
  show("skipped", r.skipped);
  show("warnings", r.warnings);
}
