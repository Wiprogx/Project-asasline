import "server-only";
import { count, inArray } from "drizzle-orm";
import { formatRef, REF_PREFIXES, sequenceKey } from "@/domain/refs";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bookings, quotations, sequences } from "@/server/db/schema";
import { readRateSourcesForEdit } from "@/server/rate-sources-config";

/** The rate sources table as Settings edits it, with the version the save is checked against. */
export async function rateSourcesForEdit() {
  await requirePermission("app.settings");
  return readRateSourcesForEdit();
}

/**
 * The statuses as they stand (legacy Settings › Quotation statuses, Booking statuses): how
 * many records sit in each, and the next QT and SB numbers of the month — read, never taken.
 */
export async function statusCounts() {
  await requirePermission("app.settings");
  const today = officeToday();
  const keys = REF_PREFIXES.map((p) => sequenceKey(p, today));
  const [b, q, seq] = await Promise.all([
    db.select({ status: bookings.status, n: count() }).from(bookings).groupBy(bookings.status),
    db
      .select({ status: quotations.status, n: count() })
      .from(quotations)
      .groupBy(quotations.status),
    db.select().from(sequences).where(inArray(sequences.key, keys)),
  ]);
  const next = REF_PREFIXES.map((prefix) => {
    const last = seq.find((s) => s.key === sequenceKey(prefix, today))?.value ?? 0;
    return { prefix, ref: formatRef(prefix, today, last + 1) };
  });
  return {
    bookings: new Map(b.map((r) => [r.status, r.n])),
    quotations: new Map(q.map((r) => [r.status, r.n])),
    next,
  };
}
