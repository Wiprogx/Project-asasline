import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { arrivalOf, type Leg } from "@/domain/legs";
import type { DbOrTx } from "@/server/db/client";
import { bookingLegs, bookings, vessels } from "@/server/db/schema";

/** The booking's onward legs in order, each with its sailing. */
export async function legsOf(tx: DbOrTx, bookingId: string) {
  const rows = await tx
    .select({
      id: bookingLegs.id,
      position: bookingLegs.position,
      vesselId: bookingLegs.vesselId,
      name: vessels.name,
      voyage: vessels.voyage,
      pol: vessels.pol,
      pod: vessels.pod,
      etd: vessels.etd,
      eta: vessels.eta,
    })
    .from(bookingLegs)
    .innerJoin(vessels, eq(vessels.id, bookingLegs.vesselId))
    .where(and(eq(bookingLegs.bookingId, bookingId), isNull(bookingLegs.archivedAt)))
    .orderBy(asc(bookingLegs.position));
  return rows satisfies (Leg & { id: string; vesselId: string })[];
}

/**
 * The booking's arrival follows its last leg (legacy finalVessel): written on the booking so
 * every screen and print reads one date. Returns whether it changed.
 */
export async function refreshArrival(tx: DbOrTx, bookingId: string, userId: string) {
  const [b] = await tx
    .select({ eta: bookings.eta, version: bookings.version, mainEta: vessels.eta })
    .from(bookings)
    .leftJoin(vessels, eq(vessels.id, bookings.vesselId))
    .where(eq(bookings.id, bookingId));
  if (!b) return false;
  const legs = await legsOf(tx, bookingId);
  const eta = arrivalOf(b.mainEta, legs);
  if (eta === b.eta) return false;
  await tx
    .update(bookings)
    .set({ eta, version: b.version + 1, updatedBy: userId, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
  return true;
}
