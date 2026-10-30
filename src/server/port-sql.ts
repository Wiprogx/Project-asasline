import "server-only";
import { type AnyColumn, type SQL, sql } from "drizzle-orm";

/** The code of the port a record's column points at, as a selected column ("BEANR"). */
export const portCodeOf = (column: AnyColumn) =>
  sql<string | null>`(select p.code from ports p where p.id = ${column})`;

/** The record's port is found by its code, its name or one of its other names. */
export const portMatches = (column: AnyColumn, like: string): SQL =>
  sql`exists (select 1 from ports p where p.id = ${column} and (p.code ilike ${like}
    or p.name ilike ${like} or exists (select 1 from unnest(p.aliases) a where a ilike ${like})))`;
