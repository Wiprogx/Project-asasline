"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type CutoffRules, sailingProblem } from "@/domain/vessels";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags } from "@/server/cache/cache";
import { writeTable } from "@/server/config-tables";
import { db } from "@/server/db/client";
import { bookings, vessels } from "@/server/db/schema";
import { CUTOFF_TAG, cutoffRulesSchema, readCutoffRules } from "@/server/vessel-config";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { bookingVesselSchema, vesselSchema, vesselUpdateSchema } from "./schemas";
import { applySailing, moveBookingsOf } from "./vessel-store";

const etaProblem = (v: { etd: string | null; eta: string | null }) => {
  const p = sailingProblem(v);
  return p ? { ok: false as const, error: p, fieldErrors: { eta: [p] } } : null;
};

export async function createVessel(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = vesselSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const bad = etaProblem(parsed.data);
  if (bad) return bad;
  const [row] = await db
    .insert(vessels)
    .values({ ...parsed.data, createdBy: user.id, updatedBy: user.id })
    .returning({ id: vessels.id });
  await audit(db, { action: "vessel.create", userId: user.id, entity: "vessel", entityId: row.id });
  revalidatePath("/settings/vessels");
  return {
    ok: true,
    data: undefined,
    message: `${parsed.data.name} · ${parsed.data.voyage} added`,
  };
}

/** Saves a sailing and moves every live booking on it: dates, closings, document steps. */
export async function updateVessel(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = vesselUpdateSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  const bad = etaProblem(fields);
  if (bad) return bad;
  try {
    const moved = await db.transaction(async (tx) => {
      await updateVersioned(
        tx,
        vessels,
        id,
        version,
        { ...fields, updatedBy: user.id },
        "This sailing",
      );
      const [v] = await tx.select().from(vessels).where(eq(vessels.id, id));
      const n = await moveBookingsOf(tx, v, await readCutoffRules(), user.id);
      await audit(tx, {
        action: "vessel.update",
        userId: user.id,
        entity: "vessel",
        entityId: id,
        detail: { etd: fields.etd, eta: fields.eta, status: fields.status, bookingsMoved: n },
      });
      return n;
    });
    revalidatePath("/settings/vessels", "layout");
    revalidatePath("/bookings", "layout");
    return {
      ok: true,
      data: undefined,
      message: moved ? `Saved — ${moved} booking${moved === 1 ? "" : "s"} moved with it` : "Saved",
    };
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
}

/** Puts a booking on a sailing (or takes it off): it takes the sailing's dates and closings. */
export async function setBookingVessel(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = bookingVesselSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, vesselId } = parsed.data;
  const r = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!b) return fail("This booking no longer exists.");
    if (b.status === "cancelled") return fail("Put the booking back before editing it.");
    if (!vesselId) {
      await tx
        .update(bookings)
        .set({ vesselId: null, version: b.version + 1, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    } else {
      const [v] = await tx.select().from(vessels).where(eq(vessels.id, vesselId));
      if (!v || v.archivedAt) return fail("That sailing is no longer in the register.");
      await applySailing(tx, bookingId, v, await readCutoffRules(), user.id);
    }
    await audit(tx, {
      action: "booking.vessel",
      userId: user.id,
      entity: "booking",
      entityId: bookingId,
      detail: { vesselId },
    });
    return null;
  });
  if (r) return r;
  revalidatePath(`/bookings/${bookingId}`, "layout");
  return {
    ok: true,
    data: undefined,
    message: vesselId ? "On the sailing — dates and closings set" : "Taken off the sailing",
  };
}

/** The closing offsets; every booking on a sailing is re-dated with them. */
export async function saveCutoffRules(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const raw = formToObject(fd);
  const parsed = cutoffRulesSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const version = Number(raw.version ?? 0);
  try {
    const moved = await db.transaction(async (tx) => {
      await writeTable(tx, "cutoffRules", parsed.data, version, user.id);
      // The new offsets, not the cached ones: the write is not committed yet.
      const rules = parsed.data as CutoffRules;
      const all = await tx.select().from(vessels);
      let n = 0;
      for (const v of all) n += await moveBookingsOf(tx, v, rules, user.id);
      await audit(tx, {
        action: "config.cutoffRules",
        userId: user.id,
        entity: "config",
        entityId: "cutoffRules",
        detail: { moved: n },
      });
      return n;
    });
    await invalidateTags(CUTOFF_TAG);
    revalidatePath("/settings/vessels");
    return {
      ok: true,
      data: undefined,
      message: `Saved — ${moved} booking${moved === 1 ? "" : "s"} re-dated`,
    };
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
}
