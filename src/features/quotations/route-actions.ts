"use server";

import { eq, max } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { liveLookupIdByLabel } from "@/server/lookups";
import { portId, portIds, withPorts } from "@/server/ports";
import { contacts, quotationRoutes } from "@/server/db/schema";
import {
  addRouteSchema,
  declineRouteSchema,
  restoreRouteSchema,
  updateRouteSchema,
} from "./editor-schemas";
import {
  bookingOn,
  editorResult,
  Refused,
  routeIn,
  settleQuotationStatus,
  touchQuotation,
} from "./editor-store";
import { fillFromLane, oceanLeg } from "./lane-store";
import { openAutoTask } from "@/server/auto-tasks";
import { officeToday } from "@/server/clock";

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
      if (!lane && (!d.pol || !d.pod)) throw new Refused("Pick an ocean leg, or type both ports.");
      const ids = lane ? { polId: lane.polId, podId: lane.podId } : await portIds(tx, d, user.id);
      const [{ pol, pod }] = await withPorts([ids]);
      if (!ids.polId || !ids.podId) throw new Refused("This ocean leg names no ports.");
      const [{ last }] = await tx
        .select({ last: max(quotationRoutes.position) })
        .from(quotationRoutes)
        .where(eq(quotationRoutes.quotationId, q.id));
      const [route] = await tx
        .insert(quotationRoutes)
        .values({
          quotationId: q.id,
          position: (last ?? -1) + 1,
          polId: ids.polId,
          podId: ids.podId,
          finalPlace: d.finalPlace,
          containerTypeId:
            lane?.containerTypeId ??
            (d.containerType
              ? await liveLookupIdByLabel(tx, "container-types", d.containerType)
              : null),
          loadingMode: d.loadingMode,
          boxes: d.boxes,
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
      const [client] = await tx
        .select({ name: contacts.name })
        .from(contacts)
        .where(eq(contacts.id, q.clientId));
      await openAutoTask(tx, {
        trigger: "dest_added",
        vars: { ref: q.ref, client: client?.name ?? "the customer", dest: `${pol} › ${pod}` },
        link: { kind: "quotation", id: q.id },
        userId: user.id,
        today: officeToday(),
      });
    }),
  );
}

export async function updateRoute(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = updateRouteSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, routeId, containerType, pol, pod, ...fields } = parsed.data;
  return editorResult(quotationId, "Destination saved", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      await routeIn(tx, quotationId, routeId);
      // The box typed, as its row of Settings › Lists › Container types (none: not said).
      const containerTypeId = containerType
        ? await liveLookupIdByLabel(tx, "container-types", containerType)
        : null;
      if (containerType && !containerTypeId)
        throw new Refused(
          `Container type "${containerType}" is not in Settings › Bookings › Container types.`,
        );
      await tx
        .update(quotationRoutes)
        .set({
          ...fields,
          polId: await portId(tx, pol, user.id),
          podId: await portId(tx, pod, user.id),
          containerTypeId,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(quotationRoutes.id, routeId));
      await audit(tx, {
        action: "quotation.route.update",
        userId: user.id,
        entity: "quotation",
        entityId: quotationId,
        detail: { routeId, route: `${pol} → ${pod}` },
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
      await settleQuotationStatus(tx, quotationId);
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
      await settleQuotationStatus(tx, quotationId);
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
