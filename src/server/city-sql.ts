import "server-only";
import { type AnyColumn, sql } from "drizzle-orm";

/** The name of the city a record's column points at, as a selected column ("Mersin"). */
export const cityNameOf = (column: AnyColumn) =>
  sql<string | null>`(select ci.name from cities ci where ci.id = ${column})`;
