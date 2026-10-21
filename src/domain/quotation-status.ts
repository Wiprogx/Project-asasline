/**
 * Where a quotation stands as the customer answers (legacy setQSt, markLost, declineRoute,
 * cancelQuote): the statuses set by hand, the quotation lost once every destination is
 * declined, and what a put-back returns to.
 */
import type { QuotationStatus } from "./shipments";

/** Set from the status picker; "declined" asks for a reason, "cancelled" goes through cancel. */
export const HAND_STATUSES = [
  "draft",
  "sent",
  "accepted",
] as const satisfies readonly QuotationStatus[];

type Route = { declined: boolean; booked: boolean };

/**
 * After a destination is declined or put back. Every destination declined and none booked: the
 * quotation is lost. One back on a lost quotation: it is open again, sent if it went out.
 */
export function statusAfterRoutes(
  current: QuotationStatus,
  routes: readonly Route[],
  sent: boolean,
): QuotationStatus {
  if (current === "cancelled" || current === "accepted") return current;
  const allDeclined = routes.length > 0 && routes.every((r) => r.declined && !r.booked);
  if (allDeclined) return "declined";
  if (current === "declined") return sent ? "sent" : "draft";
  return current;
}

/** A put-back returns to where the quotation was; a lost one never comes back as lost. */
export function statusAfterRestore(before: QuotationStatus | null, sent: boolean): QuotationStatus {
  if (before && before !== "cancelled") return before;
  return sent ? "sent" : "draft";
}

/** A live booking reads its price from the quotation: cancel those first (legacy cancelQuote). */
export function cancelProblem(liveBookings: readonly string[]): string | null {
  if (!liveBookings.length) return null;
  const s = liveBookings.length > 1 ? "s" : "";
  return `Booking${s} ${liveBookings.join(", ")} came out of this quotation. Cancel ${s ? "those" : "it"} first — a live booking cannot read its price from a cancelled quotation.`;
}
