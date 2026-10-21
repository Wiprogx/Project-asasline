/**
 * What nobody picked up (legacy escalateQueue): past the routing table's minutes, a message
 * waiting in the queue stops being a queue entry and becomes a task owned by the Team lead —
 * escalated on purpose, because the role it was sent to had its chance. Once per message, ever.
 */
import type { BookingStatus } from "./shipments";

/** A shipment that is home or cancelled has no work left: its message is closed without a task. */
export const escalationMoot = (bookingStatus: BookingStatus | null) =>
  bookingStatus === "arrived" || bookingStatus === "cancelled";

/** The task's words: what came in, cut to fit a task title. */
export function escalationTitle(subject: string | null, body: string | null): string {
  const what = (subject || body || "a message").replace(/\s+/g, " ").trim();
  const cut = what.length > 60 ? `${what.slice(0, 59)}…` : what;
  return `Nobody picked this up — ${cut}`;
}
