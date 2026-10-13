"use server";

import { and, eq, isNull } from "drizzle-orm";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookingAlerts, bookings } from "@/server/db/schema";
import { raiseAlertSchema, resolveAlertSchema } from "./alert-schemas";
import { settle } from "./settle";

/** An alert on the file (legacy addAl): everyone who opens the booking sees it until resolved. */
export async function raiseAlert(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = raiseAlertSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, level, text } = parsed.data;
  const r = await db.transaction(async (tx) => {
    const [b] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    if (!b) return fail("This booking no longer exists.");
    const [row] = await tx
      .insert(bookingAlerts)
      .values({ bookingId, level, text, createdBy: user.id })
      .returning({ id: bookingAlerts.id });
    await audit(tx, {
      action: "booking.alert.raise",
      userId: user.id,
      entity: "booking",
      entityId: bookingId,
      detail: { alertId: row.id, level, text },
    });
    return null;
  });
  if (r) return r;
  await settle(bookingId);
  return { ok: true, data: undefined, message: "Alert raised" };
}

/** The alert no longer holds (legacy resAl): resolved, kept in the record. */
export async function resolveAlert(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = resolveAlertSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, alertId } = parsed.data;
  const r = await db.transaction(async (tx) => {
    const done = await tx
      .update(bookingAlerts)
      .set({ resolvedAt: new Date(), resolvedBy: user.id })
      .where(
        and(
          eq(bookingAlerts.id, alertId),
          eq(bookingAlerts.bookingId, bookingId),
          isNull(bookingAlerts.resolvedAt),
        ),
      )
      .returning({ text: bookingAlerts.text });
    if (done.length === 0) return fail("That alert is already resolved.");
    await audit(tx, {
      action: "booking.alert.resolve",
      userId: user.id,
      entity: "booking",
      entityId: bookingId,
      detail: { alertId, text: done[0].text },
    });
    return null;
  });
  if (r) return r;
  await settle(bookingId);
  return { ok: true, data: undefined, message: "Alert resolved" };
}
