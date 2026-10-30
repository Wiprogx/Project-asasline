/**
 * The go-live import of the legacy office (docs/MIGRATION.md, "Data migration").
 *
 *   npm run import:legacy -- <export.json>            → a preview: everything is run, then rolled back
 *   npm run import:legacy -- <export.json> --apply    → the same, kept
 *   add --verbose to list every skipped row and warning
 *
 * The export is phpMyAdmin's JSON export of the legacy database (the `records` and `users`
 * tables) or `{ records, users }`. Every record imported is written to `legacy_links`, so a
 * second run adds only what the first one had not.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

class Preview extends Error {}

/** The kinds this script carries today, in the order their links are needed. */
const DONE = new Set([
  "contacts",
  "quotations",
  "bookings",
  "activities",
  "invoices",
  "payments",
  "bankLines",
  "PRICE_LISTS",
  "MESSAGES",
  "assets",
  "entries",
  "FILES",
]);
/** The settings (config records) it carries: the word lists, the catalogue, the vessels. */
const CONFIG_DONE = new Set(["RATE_ITEMS", "VESSELS"]);

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");
  const verbose = args.includes("--verbose");
  if (!file) throw new Error("Usage: npm run import:legacy -- <export.json> [--apply] [--verbose]");

  const { readLegacyExport, countByKind } = await import("../../src/domain/legacy-export");
  const { db } = await import("../../src/server/db/client");
  const { audit } = await import("../../src/server/audit");
  const { importContacts } = await import("./contacts");
  const { importUsers } = await import("./users");
  const { importRates } = await import("./config");
  const { importLookups, LEGACY_LOOKUP_LISTS } = await import("./lookups");
  const { importQuotations } = await import("./quotations");
  const { importBookings } = await import("./bookings");
  const { importActivities } = await import("./activities");
  const { importInvoices } = await import("./invoices");
  const { importBankLines, importPayments } = await import("./payments");
  const { raiseSequences } = await import("./sequences");
  const { importAssets, importPriceLists, importVessels } = await import("./registers");
  const { importMessages } = await import("./messages");
  const { importEntries } = await import("./entries");
  const { importFiles } = await import("./files");
  for (const k of [...Object.keys(LEGACY_LOOKUP_LISTS), "PAPER_DOCS"]) CONFIG_DONE.add(k);
  const { printReport } = await import("./report");

  const read = readLegacyExport(readFileSync(file, "utf8"));
  if ("error" in read) throw new Error(read.error);
  const counts = countByKind(read.records);
  console.log(`${file}: ${read.records.length} records, ${read.users.length} users`);
  for (const [kind, n] of Object.entries(counts)) console.log(`  ${kind.padEnd(12)} ${n}`);
  for (const u of read.unreadable) console.log(`  ! unreadable: ${u}`);

  try {
    await db.transaction(async (tx) => {
      const reports = {
        users: await importUsers(tx, read.users),
        "reason lists": await importLookups(tx, read.records),
        "rate catalogue": await importRates(tx, read.records),
        vessels: await importVessels(tx, read.records),
        contacts: await importContacts(tx, read.records),
        "price agreements": await importPriceLists(tx, read.records),
        quotations: await importQuotations(tx, read.records),
        bookings: await importBookings(tx, read.records),
        activities: await importActivities(tx, read.records),
        invoices: await importInvoices(tx, read.records),
        payments: await importPayments(tx, read.records),
        "bank lines": await importBankLines(tx, read.records),
        messages: await importMessages(tx, read.records),
        "fixed assets": await importAssets(tx, read.records),
        "journal entries": await importEntries(tx, read.records),
        // The bytes go to disk only when applied: a preview writes nothing.
        files: await importFiles(tx, read.records, apply),
        // Last: the counters continue after every number now in use.
        "number counters": await raiseSequences(tx),
      };
      for (const [kind, r] of Object.entries(reports)) printReport(kind, r, verbose);
      const waiting = Object.entries(counts).filter(([k]) => k !== "config" && !DONE.has(k));
      if (waiting.length)
        console.log(`\nNot carried yet: ${waiting.map(([k, n]) => `${k} ${n}`).join(", ")}`);
      const settings = read.records
        .filter((r) => r.kind === "config" && !CONFIG_DONE.has(r.id))
        .map((r) => r.id);
      if (settings.length) console.log(`Settings not carried yet: ${settings.join(", ")}`);
      const detail = Object.fromEntries(
        Object.entries(reports).map(([k, r]) => [k, { added: r.added, matched: r.matched }]),
      );
      await audit(tx, { action: "legacy.import", entity: "legacy", entityId: file, detail });
      if (!apply) throw new Preview();
    });
    console.log("\n✓ applied");
    // The legacy children land as child addresses; each becomes a contact of its own, linked.
    const { convertChildAddresses } = await import("../../src/server/convert-child-addresses");
    console.log(`${await convertChildAddresses()} child address(es) moved to contacts`);
  } catch (e) {
    if (!(e instanceof Preview)) throw e;
    console.log("\nPreview only — nothing kept. Run again with --apply to import.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
