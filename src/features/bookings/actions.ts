"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { activities, bookings, containers } from "@/server/db/schema";
import { nextRef } from "@/server/sequences";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { cancelSchema, newBookingSchema, restoreSchema, statusSchema } from "./schemas";
import { guarded, settle } from "./settle";

/** The SB number is issued inside the insert's transaction: no gaps from failed saves. */
export async function createBooking(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = newBookingSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { containerCount, containerType, ...fields } = parsed.data;

  const id = await db.transaction(async (tx) => {
    const ref = await nextRef(tx, "SB", officeToday());
    const [row] = await tx
      .insert(bookings)
      .values({ ...fields, ref, payerId: fields.clientId, createdBy: user.id, updatedBy: user.id })
      .returning({ id: bookings.id });
    await tx.insert(containers).values(
      Array.from({ length: containerCount }, (_, i) => ({
        bookingId: row.id,
        position: i,
        type: containerType,
        createdBy: user.id,
      })),
    );
    await audit(tx, {
      action: "booking.create",
      userId: user.id,
      entity: "booking",
      entityId: row.id,
      detail: { ref },
    });
    return row.id;
  });
  await settle(id);
  redirect(`/bookings/${id}`);
}

export async function setBookingStatus(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = statusSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, status } = parsed.data;
  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        await updateVersioned(
          tx,
          bookings,
          id,
          version,
          { status, updatedBy: user.id },
          "This booking",
        );
        await audit(tx, {
          action: "booking.status",
          userId: user.id,
          entity: "booking",
          entityId: id,
          detail: { status },
        });
      }),
    "Status updated",
  );
}

/** Cancel keeps the number, files and history; open tasks are withdrawn with the reason. */
export async function cancelBooking(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.cancel");
  const parsed = cancelSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        const [cur] = await tx
          .select({ status: bookings.status })
          .from(bookings)
          .where(eq(bookings.id, id));
        if (!cur || cur.status === "cancelled") throw new ConflictError("This booking");
        await updateVersioned(
          tx,
          bookings,
          id,
          version,
          {
            status: "cancelled",
            statusBeforeCancel: cur.status,
            cancelReason: reason,
            updatedBy: user.id,
          },
          "This booking",
        );
        await tx
          .update(activities)
          .set({
            state: "withdrawn",
            withdrawReason: `Booking cancelled: ${reason}`,
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(activities.linkKind, "booking"),
              eq(activities.linkId, id),
              eq(activities.state, "open"),
            ),
          );
        await audit(tx, {
          action: "booking.cancel",
          userId: user.id,
          entity: "booking",
          entityId: id,
          detail: { reason },
        });
      }),
    "Booking cancelled",
  );
}

export async function restoreBooking(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.cancel");
  const parsed = restoreSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;
  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        const [cur] = await tx
          .select({ prev: bookings.statusBeforeCancel })
          .from(bookings)
          .where(eq(bookings.id, id));
        await updateVersioned(
          tx,
          bookings,
          id,
          version,
          {
            status: cur?.prev ?? "confirmed",
            statusBeforeCancel: null,
            cancelReason: null,
            updatedBy: user.id,
          },
          "This booking",
        );
        await audit(tx, {
          action: "booking.restore",
          userId: user.id,
          entity: "booking",
          entityId: id,
        });
      }),
    "Booking put back",
  );
}
