import "server-only";
import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import type { QuotationStatus } from "@/domain/shipments";
import { officeZone } from "@/server/clock";
import { contacts, quotations } from "@/server/db/schema";

/** What narrows the quotations list: the search, a status, a period, a customer, and what is left out. */
export type ListScope = {
  q?: string;
  status?: QuotationStatus;
  /** The day the quotation was made, in the office's zone (legacy qDate on createdAt). */
  period?: { from: string; to: string } | null;
  /** The customer by name ("Show similar" on a row). */
  client?: string;
  /** The rows left out ("Filter out" on a row). */
  exclude?: { client?: string; status?: QuotationStatus };
};

/** The day a quotation was made, as the office counts days (invariant 4). */
export const createdOn = sql<string>`(${quotations.createdAt} at time zone ${officeZone()})::date`;

/** The list's filters as SQL. */
export function scopeWhere(s: ListScope) {
  const q = s.q?.trim() ?? "";
  const like = `%${q}%`;
  return and(
    s.status ? eq(quotations.status, s.status) : undefined,
    s.client ? eq(contacts.name, s.client) : undefined,
    s.exclude?.status ? ne(quotations.status, s.exclude.status) : undefined,
    s.exclude?.client ? ne(contacts.name, s.exclude.client) : undefined,
    q ? or(ilike(quotations.ref, like), ilike(contacts.name, like)) : undefined,
    s.period
      ? sql`${createdOn} between ${s.period.from}::date and ${s.period.to}::date`
      : undefined,
  );
}

/** The scope as a cache key. */
export const scopeKey = (s: ListScope) =>
  [
    s.status ?? "*",
    s.client ?? "*",
    s.exclude?.status ?? "*",
    s.exclude?.client ?? "*",
    (s.q ?? "").trim().toLowerCase(),
    s.period ? `${s.period.from}_${s.period.to}` : "*",
  ].join(":");
