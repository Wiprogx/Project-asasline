"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { type ActionResult, formToObject, invalid, nullMissing } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db, type Tx } from "@/server/db/client";
import { bookings, containers } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { addContainerSchema, containerSchema, removeContainerSchema } from "./schemas";
import { guarded, Refused } from "./settle";

/** Box changes are logged on the booking, so its history tells the whole story. */
async function editableBooking(tx: Tx, bookingId: string) {
  const [b] = await tx
    .select({ status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!b) throw new ConflictError("This booking");
  if (b.status === "cancelled")
    throw new Refused("Put the booking back before changing its boxes.");
}

export async function updateContainer(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = containerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, bookingId, version, ...fields } = parsed.data;
  const values = nullMissing(fields, ["number", "tareKg", "cargoKg"]);

  return guarded(
    bookingId,
    () =>
      db.transaction(async (tx) => {
        await editableBooking(tx, bookingId);
        const [box] = await tx
          .select({ bookingId: containers.bookingId })
          .from(containers)
          .where(eq(containers.id, id));
        if (box?.bookingId !== bookingId) throw new ConflictError("This container");
        await updateVersioned(
          tx,
          containers,
          id,
          version,
          { ...values, updatedBy: user.id },
          "This container",
        );
        await audit(tx, {
          action: "container.edit",
          userId: user.id,
          entity: "booking",
          entityId: bookingId,
          detail: { container: id, number: values.number, seals: values.seals },
        });
      }),
    "Container saved",
  );
}

export async function addContainer(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = addContainerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, type } = parsed.data;

  return guarded(
    bookingId,
    () =>
      db.transaction(async (tx) => {
        await editableBooking(tx, bookingId);
        const [{ last }] = await tx
          .select({ last: max(containers.position) })
          .from(containers)
          .where(eq(containers.bookingId, bookingId));
        const [row] = await tx
          .insert(containers)
          .values({
            bookingId,
            type,
            position: (last ?? -1) + 1,
            createdBy: user.id,
            updatedBy: user.id,
          })
          .returning({ id: containers.id });
        await audit(tx, {
          action: "container.add",
          userId: user.id,
          entity: "booking",
          entityId: bookingId,
          detail: { container: row.id, type },
        });
      }),
    "Container added",
  );
}

/** Removed with a reason, never deleted: a box that was booked and dropped is still history. */
export async function removeContainer(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = removeContainerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, bookingId, version, reason } = parsed.data;

  return guarded(
    bookingId,
    () =>
      db.transaction(async (tx) => {
        await editableBooking(tx, bookingId);
        const live = await tx
          .select({ id: containers.id })
          .from(containers)
          .where(and(eq(containers.bookingId, bookingId), isNull(containers.archivedAt)));
        if (live.length <= 1)
          throw new Refused("A booking keeps at least one container; cancel the booking instead.");
        if (!live.some((c) => c.id === id)) throw new ConflictError("This container");
        await updateVersioned(
          tx,
          containers,
          id,
          version,
          { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason },
          "This container",
        );
        await audit(tx, {
          action: "container.remove",
          userId: user.id,
          entity: "booking",
          entityId: bookingId,
          detail: { container: id, reason },
        });
      }),
    "Container removed",
  );
}
