"use server";

import { and, eq, like, sql } from "drizzle-orm";
import { addDays } from "@/domain/dates";
import { releaseState, startTrack, toggleStep } from "@/domain/release";
import { type ActionResult, fail, formToObject, invalid, nullMissing } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { activities, bookings } from "@/server/db/schema";
import { readReleaseStates, readTrackSteps } from "@/server/release-config";
import { updateVersioned } from "@/server/versioned";
import { originalsSchema, releaseSchema, trackStepSchema } from "./schemas";
import { guarded, Refused } from "./settle";

const HOLD_TITLE = "Clear the hold on ";

async function liveBooking(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string) {
  const [b] = await tx
    .select({
      ref: bookings.ref,
      status: bookings.status,
      release: bookings.release,
      track: bookings.track,
    })
    .from(bookings)
    .where(eq(bookings.id, id));
  if (!b) throw new Refused("This booking no longer exists.");
  if (b.status === "cancelled") throw new Refused("Put the booking back before changing it.");
  return b;
}

/**
 * Where the shipment stands for the consignee (legacy release sheet). A hold records who asked
 * and what must happen, and opens a task for tomorrow to clear it; lifting it closes that task.
 */
export async function setRelease(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = releaseSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, release, releaseById, releaseNote } = parsed.data;
  const states = await readReleaseStates();
  const next = states.find((s) => s.code === release);
  if (!next) return fail("That release state is not in the list any more.");
  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        const b = await liveBooking(tx, id);
        const was = releaseState(states, b.release);
        await updateVersioned(
          tx,
          bookings,
          id,
          version,
          {
            release,
            releaseById: next.hold ? (releaseById ?? null) : null,
            releaseNote: next.hold ? (releaseNote ?? null) : null,
            updatedBy: user.id,
          },
          "This booking",
        );
        const today = officeToday();
        if (next.hold) {
          await tx.insert(activities).values({
            title: `${HOLD_TITLE}${b.ref} — ${next.label}`,
            assigneeId: user.id,
            due: addDays(today, 1),
            linkKind: "booking",
            linkId: id,
            createdBy: user.id,
            updatedBy: user.id,
          });
        } else {
          await tx
            .update(activities)
            .set({
              state: "done",
              doneAt: new Date(),
              doneBy: user.id,
              version: sql`${activities.version} + 1`,
              updatedAt: new Date(),
              updatedBy: user.id,
            })
            .where(
              and(
                eq(activities.linkKind, "booking"),
                eq(activities.linkId, id),
                eq(activities.state, "open"),
                like(activities.title, `${HOLD_TITLE}%`),
              ),
            );
        }
        await audit(tx, {
          action: "booking.release",
          userId: user.id,
          entity: "booking",
          entityId: id,
          detail: { from: was.code, to: release, note: next.hold ? (releaseNote ?? null) : null },
        });
      }),
    next.hold ? "Hold recorded — a task for tomorrow asks to clear it" : "Release status updated",
  );
}

/** One milestone of the journey ticked or unticked by hand (legacy tglTrack); a tick carries the day. */
export async function toggleTrackStep(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = trackStepSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, index, place } = parsed.data;
  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        const b = await liveBooking(tx, id);
        const track = b.track.length ? b.track : startTrack(await readTrackSteps());
        if (index >= track.length) throw new Refused("That step is no longer in the journey.");
        const next = toggleStep(track, index, officeToday()).map((t, i) =>
          i === index && place !== undefined ? { ...t, place: place || null } : t,
        );
        await updateVersioned(
          tx,
          bookings,
          id,
          version,
          { track: next, updatedBy: user.id },
          "This booking",
        );
        await audit(tx, {
          action: "booking.track",
          userId: user.id,
          entity: "booking",
          entityId: id,
          detail: { step: track[index].name, done: next[index].done },
        });
      }),
    "Journey updated",
  );
}

/** How the original papers travel: who receives them, by which courier, when, under which number. */
export async function setOriginals(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = originalsSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  const values = nullMissing(fields, ["docReceiverId", "sendMode", "sendDate", "sendTracking"]);
  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        await liveBooking(tx, id);
        await updateVersioned(
          tx,
          bookings,
          id,
          version,
          { ...values, updatedBy: user.id },
          "This booking",
        );
        await audit(tx, {
          action: "booking.originals",
          userId: user.id,
          entity: "booking",
          entityId: id,
          detail: values,
        });
      }),
    "Originals noted",
  );
}
