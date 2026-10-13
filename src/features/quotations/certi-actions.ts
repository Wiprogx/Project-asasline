"use server";

import { and, eq, ilike, isNull } from "drizzle-orm";
import { isCertiweight } from "@/domain/certiweight";
import { formatCents } from "@/domain/money";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db, type Tx } from "@/server/db/client";
import { quotationLines, rateItems } from "@/server/db/schema";
import { certiOffSchema, certiOnSchema } from "./certi-schemas";
import {
  bookingOn,
  certificateFiled,
  editorResult,
  insertPricedLine,
  lineIn,
  nextPosition,
  Refused,
  resyncBookingOf,
  routeIn,
  touchQuotation,
} from "./editor-store";

type OnTheFile = { quotationId: string; version: number; routeId: string; bookingId: string };

/** The quotation and the booking that ships its destination, or a refusal. */
async function fileOf(tx: Tx, d: OnTheFile, userId: string) {
  const q = await touchQuotation(tx, d.quotationId, d.version, userId);
  const route = await routeIn(tx, q.id, d.routeId);
  const booking = await bookingOn(tx, route.id);
  if (!booking || booking.id !== d.bookingId)
    throw new Refused("This booking does not ship that destination.");
  return { q, route, booking };
}

async function logBoth(
  tx: Tx,
  userId: string,
  f: Awaited<ReturnType<typeof fileOf>>,
  on: boolean,
  detail: object,
) {
  const action = on ? "certiweight.on" : "certiweight.off";
  await audit(tx, {
    action: `quotation.${action}`,
    userId,
    entity: "quotation",
    entityId: f.q.id,
    detail: { ...detail, booking: f.booking.ref },
  });
  await audit(tx, {
    action: `booking.${action}`,
    userId,
    entity: "booking",
    entityId: f.booking.id,
    detail: { ...detail, quotation: f.q.ref },
  });
}

/** Switched on from the booking (legacy "Add Certiweight"): the charge goes on the quotation. */
export async function switchOnCertiweight(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = certiOnSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  let said = "";
  const result = await editorResult(d.quotationId, "Certiweight switched on", () =>
    db.transaction(async (tx) => {
      const f = await fileOf(tx, d, user.id);
      const live = await tx
        .select({ description: quotationLines.description })
        .from(quotationLines)
        .where(and(eq(quotationLines.routeId, f.route.id), isNull(quotationLines.archivedAt)));
      if (live.some((l) => isCertiweight(l.description)))
        throw new Refused("Certiweight is already on this shipment.");
      const [item] = await tx
        .select({ id: rateItems.id })
        .from(rateItems)
        .where(and(isNull(rateItems.archivedAt), ilike(rateItems.name, "%certiweight%")))
        .limit(1);
      if (!item) throw new Refused("No Certiweight item in the catalogue.");
      const { label, price } = await insertPricedLine(tx, {
        q: f.q,
        routeId: f.route.id,
        itemId: item.id,
        qty: 1,
        position: await nextPosition(tx, f.route.id),
        day: officeToday(),
        userId: user.id,
        typed: { sellCents: d.sellCents, costCents: d.costCents },
        charge: true,
      });
      const sell = d.sellCents ?? price.sellCents;
      said = `${formatCents(sell)} per container, added to ${f.q.ref}`;
      await resyncBookingOf(tx, f.route.id, user.id);
      await logBoth(tx, user.id, f, true, { item: label, sellCents: sell });
    }),
  );
  return result.ok ? { ...result, message: `Certiweight on — ${said}` } : result;
}

/** Cancelled before any certificate is in (legacy "Cancel Certiweight"): the line is archived. */
export async function cancelCertiweight(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = certiOffSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  return editorResult(d.quotationId, "Certiweight cancelled on the booking and the quotation", () =>
    db.transaction(async (tx) => {
      const f = await fileOf(tx, d, user.id);
      const { line } = await lineIn(tx, f.q.id, d.lineId);
      if (!isCertiweight(line.description) || line.routeId !== f.route.id)
        throw new Refused("That line is not this shipment's Certiweight.");
      if (await certificateFiled(tx, f.route.id))
        throw new Refused("The certificate is in — the weighing was done, so the charge stays.");
      await tx
        .update(quotationLines)
        .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: d.reason })
        .where(and(eq(quotationLines.id, line.id), isNull(quotationLines.archivedAt)));
      await resyncBookingOf(tx, f.route.id, user.id);
      await logBoth(tx, user.id, f, false, { item: line.description, reason: d.reason });
    }),
  );
}
