"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import {
  type ActionResult,
  formRows,
  formToObject,
  invalid,
  nullMissing,
} from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db, type Tx } from "@/server/db/client";
import { addressesOf, addressOf } from "@/server/addresses";
import { syncBookingRules } from "@/server/rules-sync";
import { bookings, containers } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import {
  addContainerSchema,
  CLEARABLE_CONTAINER,
  containerSchema,
  containerStopsSchema,
  removeContainerSchema,
} from "./schemas";
import { guarded, Refused } from "./settle";
import { replaceGoods, resolveGoods } from "@/server/container-goods";
import { liveLookupIdByLabel } from "@/server/lookups";
import type { Stop } from "@/domain/loading";

const STOP_FIELDS = [
  "stopPlaceId",
  "stopDate",
  "stopTime",
  "stopMode",
  "stopPickBackDate",
  "stopPickBackTime",
] as const;

/** A stop's words are written from its place when the box is saved, as the loading address's are. */
async function stopsOf(
  tx: Tx,
  rows: {
    stopPlaceId: string;
    stopDate?: string;
    stopTime?: string;
    stopMode?: string;
    stopPickBackDate?: string;
    stopPickBackTime?: string;
  }[],
): Promise<Stop[]> {
  const words = await addressesOf(
    tx,
    rows.map((r) => r.stopPlaceId),
  );
  return rows.map((r) => {
    const address = words.get(r.stopPlaceId);
    if (!address) throw new Refused("A stop's place no longer exists.");
    return {
      placeId: r.stopPlaceId,
      address,
      date: r.stopDate ?? null,
      time: r.stopTime ?? null,
      loadingMode: r.stopMode ?? null,
      pickBackDate: r.stopPickBackDate ?? null,
      pickBackTime: r.stopPickBackTime ?? null,
    };
  });
}

/** Box changes are logged on the booking, so its history tells the whole story. */
async function editableBooking(tx: Tx, bookingId: string) {
  const [b] = await tx
    .select({
      status: bookings.status,
      loadingMode: bookings.loadingMode,
      pickupDepotId: bookings.pickupDepotId,
      loadAddressId: bookings.loadAddressId,
      loadAddress: bookings.loadAddress,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!b) throw new ConflictError("This booking");
  if (b.status === "cancelled")
    throw new Refused("Put the booking back before changing its boxes.");
  return b;
}

export async function updateContainer(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = containerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const stopRows = containerStopsSchema.safeParse(formRows(fd, STOP_FIELDS));
  if (!stopRows.success)
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: { stops: stopRows.error.issues.map((i) => i.message) },
    };
  const { id, bookingId, version, seals, hsLines, packageType, type, ...fields } = parsed.data;
  const values: Record<string, unknown> = nullMissing(fields, CLEARABLE_CONTAINER);

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
        // A place chosen writes the words the trucker copy reads; a box from before keeps its own.
        if (values.loadAddressId) {
          values.loadAddress = await addressOf(tx, values.loadAddressId as string);
          if (!values.loadAddress) throw new Refused("The loading address no longer exists.");
        }
        values.stops = await stopsOf(tx, stopRows.data);
        // Every package type and seal source must be in its Settings list (Package types, Seal sources).
        const goods = await resolveGoods(tx, { hsLines, seals, packageType });
        if (goods.problem !== null) throw new Refused(goods.problem);
        const typeId = await liveLookupIdByLabel(tx, "container-types", type);
        if (!typeId)
          throw new Refused(
            `Container type "${type}" is not in Settings › Bookings › Container types.`,
          );
        await updateVersioned(
          tx,
          containers,
          id,
          version,
          { ...values, typeId, packageTypeId: goods.packageTypeId, updatedBy: user.id },
          "This container",
        );
        await replaceGoods(tx, id, goods, user.id);
        await audit(tx, {
          action: "container.edit",
          userId: user.id,
          entity: "booking",
          entityId: bookingId,
          detail: { container: id, number: values.number, seals },
        });
        // The per-box steps and the VGM wait on the boxes and their weights (rules-sync).
        await syncBookingRules(tx, bookingId, user.id);
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
        const b = await editableBooking(tx, bookingId);
        const [{ last }] = await tx
          .select({ last: max(containers.position) })
          .from(containers)
          .where(eq(containers.bookingId, bookingId));
        const typeId = await liveLookupIdByLabel(tx, "container-types", type);
        if (!typeId)
          throw new Refused(
            `Container type "${type}" is not in Settings › Bookings › Container types.`,
          );
        const [row] = await tx
          .insert(containers)
          .values({
            bookingId,
            typeId,
            position: (last ?? -1) + 1,
            // What a fresh box inherits (legacy BOX_DEF): the quoted mode and the proposed place —
            // never a date or an hour, which are each box's own.
            loadingMode: b.loadingMode,
            pickupDepotId: b.pickupDepotId,
            loadAddressId: b.loadAddressId,
            loadAddress: b.loadAddress,
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
        await syncBookingRules(tx, bookingId, user.id);
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
        await syncBookingRules(tx, bookingId, user.id);
      }),
    "Container removed",
  );
}
