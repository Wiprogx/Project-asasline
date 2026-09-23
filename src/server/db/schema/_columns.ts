import { integer, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Columns every business record carries.
 *
 * - `version` drives optimistic concurrency: an update names the version it read, and a
 *   stale write becomes a conflict card instead of silently overwriting a colleague.
 * - `archivedAt` / `archivedReason` replace deletion (invariant 1). Nothing numbered or
 *   referenced is ever removed; it is archived with a reason and can be put back.
 */
export const recordColumns = {
  id: uuid().primaryKey().defaultRandom(),
  version: integer().notNull().default(1),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid(),
  archivedAt: timestamp({ withTimezone: true }),
  archivedBy: uuid(),
  archivedReason: text(),
};

/** Money is integer cents; there is no float money column anywhere (probe tms.floatMoney). */
export const cents = (name?: string) => (name ? integer(name) : integer());
