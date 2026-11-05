import "server-only";
import { BOOKING_VIEW } from "@/domain/booking-list";
import { requirePermission } from "@/server/auth/dal";
import { readTableView } from "@/server/prefs";

/** The columns and widths the signed-in person chose for the bookings list. */
export async function bookingView() {
  const user = await requirePermission("app.bookings");
  return readTableView(user.id, BOOKING_VIEW);
}
