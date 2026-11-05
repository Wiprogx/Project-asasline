"use server";

import { revalidatePath } from "next/cache";
import { BOOKING_VIEW } from "@/domain/booking-list";
import { type ActionResult, invalid } from "@/lib/action-result";
import { tableViewSchema } from "@/lib/zod-fields";
import { requirePermission } from "@/server/auth/dal";
import { writeTableView } from "@/server/prefs";

const schema = tableViewSchema(BOOKING_VIEW);

/** Saves how the signed-in person reads the bookings list: the columns ticked, the widths dragged, or both. */
export async function saveBookingView(patch: unknown): Promise<ActionResult> {
  const user = await requirePermission("app.bookings");
  const parsed = schema.safeParse(patch);
  if (!parsed.success) return invalid(parsed.error);
  await writeTableView(user.id, BOOKING_VIEW, parsed.data);
  revalidatePath("/bookings");
  return { ok: true, data: undefined };
}
