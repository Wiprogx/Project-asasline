"use server";

import { formatCents } from "@/domain/money";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { raiseChargeSchema } from "./charge-schemas";
import {
  bookingOn,
  editorResult,
  insertPricedLine,
  nextPosition,
  Refused,
  resyncBookingOf,
  routeIn,
  touchQuotation,
} from "./editor-store";

/**
 * A charge raised from the booking (legacy addExtraCharge, chargeExtraTime): it lands on the
 * quotation's destination the booking ships, so it is invoiced instead of forgotten — a
 * charge, never a term, even when it comes from the free-time category (detention, storage).
 */
export async function raiseCharge(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = raiseChargeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  let said = "";
  const result = await editorResult(d.quotationId, "Charge added to the quotation", () =>
    db.transaction(async (tx) => {
      const q = await touchQuotation(tx, d.quotationId, d.version, user.id);
      const route = await routeIn(tx, q.id, d.routeId);
      const booking = await bookingOn(tx, route.id);
      if (!booking || booking.id !== d.bookingId)
        throw new Refused("This booking does not ship that destination.");
      const { label, price } = await insertPricedLine(tx, {
        q,
        routeId: route.id,
        itemId: d.itemId,
        qty: d.qty,
        position: await nextPosition(tx, route.id),
        day: officeToday(),
        userId: user.id,
        typed: { sellCents: d.sellCents, costCents: d.costCents },
        perBox: d.appliesTo === "all",
        charge: true,
      });
      const unit = d.sellCents ?? price.sellCents;
      said = `${label} ×${d.qty} — ${formatCents(unit * d.qty)}${d.appliesTo === "all" ? " per container" : ""}`;
      const detail = {
        item: label,
        qty: d.qty,
        sellCents: unit,
        appliesTo: d.appliesTo,
        reason: d.reason,
      };
      await resyncBookingOf(tx, route.id, user.id);
      await audit(tx, {
        action: "quotation.charge",
        userId: user.id,
        entity: "quotation",
        entityId: q.id,
        detail: { ...detail, booking: booking.ref },
      });
      await audit(tx, {
        action: "booking.charge",
        userId: user.id,
        entity: "booking",
        entityId: booking.id,
        detail: { ...detail, quotation: q.ref },
      });
    }),
  );
  return result.ok ? { ...result, message: `Added to the quotation: ${said}` } : result;
}
