"use server";

import { eq, max } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { quotationRoutes } from "@/server/db/schema";
import {
  addRouteSchema,
  declineRouteSchema,
  restoreRouteSchema,
  updateRouteSchema,
} from "./editor-schemas";
import { bookingOn, editorResult, Refused, routeIn, touchQuotation } from "./editor-store";
import { fillFromLane, oceanLeg } from "./lane-store";

/**
 * A new destination. Picked from an ocean leg of the catalogue, it comes with its lines —
 * the leg and the destination country's documents — each priced for the customer.
 */
export async function addRoute(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = addRouteSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  return editorResult(d.quotationId, "Destination added", () =>
    db.transaction(async (tx) => {
      const q = await touchQuotation(tx, d.quotationId, d.version, user.id);
      const lane = d.laneId ? await oceanLeg(tx, d.laneId) : null;
      const pol = lane?.pol ?? d.pol;
      const pod = lane?.pod ?? d.pod;
      if (!pol || !pod) throw new Refused("Pick an ocean leg, or type both ports.");
      const [{ last }] = await tx
        .select({ last: max(quotationRoutes.position) })
        .from(quotationRoutes)
        .where(eq(quotationRoutes.quotationId, q.id));
      const [route] = await tx
        .insert(quotationRoutes)
        .values({
          quotationId: q.id,
          position: (last ?? -1) + 1,
          pol,
          pod,
          finalPlace: d.finalPlace,
          containerType: lane?.containerType ?? d.containerType,
          createdBy: user.id,
        })
        .returning({ id: quotationRoutes.id });
      if (lane) await fillFromLane(tx, { q, lane, routeId: route.id, userId: user.id });
      await audit(tx, {
        action: "quotation.route.add",
        userId: user.id,
        entity: "quotation",
        entityId: q.id,
        detail: { route: `${pol} → ${pod}`, lane: lane?.id ?? null },
      });
    }),
  );
}

export async function updateRoute(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = updateRouteSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, routeId, ...fields } = parsed.data;
  return editorResult(quotationId, "Destination saved", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      await routeIn(tx, quotationId, routeId);
      await tx
        .update(quotationRoutes)
        .set({ ...fields, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(quotationRoutes.id, routeId));
      await audit(tx, {
        action: "quotation.route.update",
        userId: user.id,
        entity: "quotation",
        entityId: quotationId,
        detail: { routeId, route: `${fields.pol} → ${fields.pod}` },
      });
    }),
  );
}

/** The customer said no to this destination: it stays on the quotation, marked, with why. */
export async function declineRoute(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = declineRouteSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, routeId, reason } = parsed.data;
  return editorResult(quotationId, "Marked as declined", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      await routeIn(tx, quotationId, routeId);
      const booked = await bookingOn(tx, routeId);
      if (booked)
        throw new Refused(`This destination is booked as ${booked.ref}; cancel the booking first.`);
      await tx
        .update(quotationRoutes)
        .set({ declined: true, declinedReason: reason, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(quotationRoutes.id, routeId));
      await audit(tx, {
        action: "quotation.route.decline",
        userId: user.id,
        entity: "quotation",
        entityId: quotationId,
        detail: { routeId, reason },
      });
    }),
  );
}

export async function restoreRoute(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = restoreRouteSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, routeId } = parsed.data;
  return editorResult(quotationId, "Destination back on the quotation", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      await routeIn(tx, quotationId, routeId);
      await tx
        .update(quotationRoutes)
        .set({ declined: false, declinedReason: null, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(quotationRoutes.id, routeId));
      await audit(tx, {
        action: "quotation.route.restore",
        userId: user.id,
        entity: "quotation",
        entityId: quotationId,
        detail: { routeId },
      });
    }),
  );
}
