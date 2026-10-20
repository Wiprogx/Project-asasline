import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Which new record each legacy record became (scripts/import/legacy.ts). A rerun of the import
 * finds the legacy id here and skips it, so nothing is ever imported twice; later kinds read
 * it to turn a legacy clientId into the contact's new id.
 */
export const legacyLinks = pgTable(
  "legacy_links",
  {
    /** The legacy record kind ("contacts", "bookings"…) or "users". */
    kind: text().notNull(),
    legacyId: text().notNull(),
    recordId: uuid().notNull(),
    importedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.legacyId] })],
);
