"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { legProblem } from "@/domain/legs";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { bookingLegs, bookings, vessels } from "@/server/db/schema";
import { legsOf, refreshArrival } from "./leg-store";

const addSchema = z.object({
  bookingId: z.uuid(),
  vesselId: z.uuid("Pick the connecting sailing"),
});
const removeSchema = z.object({ bookingId: z.uuid(), legId: z.uuid() });

async function settle(bookingId: string) {
  await invalidateTags(tags.bookings, tags.booking(bookingId), tags.dashboard);
  revalidatePath(`/bookings/${bookingId}`, "layout");
}

/** An onward leg after the main sailing (legacy "Add transhipment leg"): the arrival follows it. */
export async function addBookingLeg(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = addSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, vesselId } = parsed.data;
  const r = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!b) return fail("This booking no longer exists.");
    if (b.status === "cancelled") return fail("Put the booking back before editing it.");
    const legs = await legsOf(tx, bookingId);
    const problem = legProblem(vesselId, b.vesselId, legs);
    if (problem) return fail(problem);
    const [v] = await tx.select().from(vessels).where(eq(vessels.id, vesselId));
    if (!v || v.archivedAt) return fail("That sailing is no longer in the register.");
    const [{ last }] = await tx
      .select({ last: max(bookingLegs.position) })
      .from(bookingLegs)
      .where(eq(bookingLegs.bookingId, bookingId));
    await tx
      .insert(bookingLegs)
      .values({ bookingId, vesselId, position: (last ?? 0) + 1, createdBy: user.id });
    await refreshArrival(tx, bookingId, user.id);
    await audit(tx, {
      action: "booking.leg.add",
      userId: user.id,
      entity: "booking",
      entityId: bookingId,
      detail: { vesselId, name: v.name, voyage: v.voyage },
    });
    return null;
  });
  if (r) return r;
  await settle(bookingId);
  return { ok: true, data: undefined, message: "Leg added — the arrival follows the last one" };
}

/** A leg taken off; the arrival falls back to the previous leg or the main sailing. */
export async function removeBookingLeg(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = removeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, legId } = parsed.data;
  const r = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!b) return fail("This booking no longer exists.");
    if (b.status === "cancelled") return fail("Put the booking back before editing it.");
    const gone = await tx
      .delete(bookingLegs)
      .where(eq(bookingLegs.id, legId))
      .returning({ vesselId: bookingLegs.vesselId });
    if (gone.length === 0) return fail("That leg is already off.");
    await refreshArrival(tx, bookingId, user.id);
    await audit(tx, {
      action: "booking.leg.remove",
      userId: user.id,
      entity: "booking",
      entityId: bookingId,
      detail: { vesselId: gone[0].vesselId },
    });
    return null;
  });
  if (r) return r;
  await settle(bookingId);
  return { ok: true, data: undefined, message: "Leg taken off" };
}
