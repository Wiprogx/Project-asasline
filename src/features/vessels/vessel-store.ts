import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { bookingFieldsOf, type CutoffRules } from "@/domain/vessels";
import type { Tx } from "@/server/db/client";
import { bookings, vessels } from "@/server/db/schema";
import { syncBookingRules } from "@/server/rules-sync";

type Vessel = typeof vessels.$inferSelect;

/**
 * A booking takes its sailing's ship, voyage, dates and closings, and its document steps are
 * re-planned on them. Nothing changes (no version bump) when it already had them all.
 */
export async function applySailing(
  tx: Tx,
  bookingId: string,
  v: Vessel,
  rules: CutoffRules,
  userId: string,
): Promise<boolean> {
  const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update");
  if (!b || b.status === "cancelled") return false;
  const fields = { vesselId: v.id, ...bookingFieldsOf(v, rules) };
  const same = Object.entries(fields).every(
    ([k, val]) => (b as Record<string, unknown>)[k] === val,
  );
  if (same) return false;
  await tx
    .update(bookings)
    .set({ ...fields, version: b.version + 1, updatedBy: userId, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
  await syncBookingRules(tx, bookingId, userId);
  return true;
}

/** Every live booking on the sailing, moved with it. Returns how many changed. */
export async function moveBookingsOf(tx: Tx, v: Vessel, rules: CutoffRules, userId: string) {
  const on = await tx
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.vesselId, v.id),
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
      ),
    );
  let moved = 0;
  for (const b of on) if (await applySailing(tx, b.id, v, rules, userId)) moved++;
  return moved;
}
