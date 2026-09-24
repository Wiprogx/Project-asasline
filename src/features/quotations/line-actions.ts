"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db, type Tx } from "@/server/db/client";
import { quotationLines } from "@/server/db/schema";
import { addLineSchema, removeLineSchema, updateLineSchema } from "./editor-schemas";
import {
  editorResult,
  insertPricedLine,
  invoicedQty,
  lineIn,
  Refused,
  resyncBookingOf,
  routeIn,
  touchQuotation,
} from "./editor-store";

type NewLine = ReturnType<typeof addLineSchema.parse>;

async function nextPosition(tx: Tx, routeId: string) {
  const [{ last }] = await tx
    .select({ last: max(quotationLines.position) })
    .from(quotationLines)
    .where(eq(quotationLines.routeId, routeId));
  return (last ?? -1) + 1;
}

/** A line typed by hand: its own description and price. */
async function insertTypedLine(tx: Tx, d: NewLine, position: number, userId: string) {
  if (!d.description || d.sellCents === undefined)
    throw new Refused("Pick an item from the catalogue, or describe the service and its price.");
  await tx.insert(quotationLines).values({
    routeId: d.routeId,
    position,
    description: d.description,
    qty: d.qty,
    sellCents: d.sellCents,
    costCents: d.costCents ?? null,
    vatCode: d.vatCode ?? "EX41",
    priceSource: "manual",
    createdBy: userId,
  });
}

/** A charge on a destination: from the catalogue, priced for the customer, or typed. */
export async function addLine(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = addLineSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  return editorResult(d.quotationId, "Line added", () =>
    db.transaction(async (tx) => {
      const q = await touchQuotation(tx, d.quotationId, d.version, user.id);
      const route = await routeIn(tx, q.id, d.routeId);
      if (route.declined) throw new Refused("Put the destination back before adding to it.");
      const position = await nextPosition(tx, route.id);
      if (d.itemId)
        await insertPricedLine(tx, {
          q,
          routeId: route.id,
          itemId: d.itemId,
          qty: d.qty,
          position,
          day: officeToday(),
          userId: user.id,
          typed: { sellCents: d.sellCents, costCents: d.costCents },
        });
      else await insertTypedLine(tx, d, position, user.id);
      await resyncBookingOf(tx, route.id, user.id);
      await audit(tx, {
        action: "quotation.line.add",
        userId: user.id,
        entity: "quotation",
        entityId: q.id,
        detail: { routeId: route.id, itemId: d.itemId, qty: d.qty },
      });
    }),
  );
}

/** A changed sell price is the person's own: the line is marked "typed" from then on. */
export async function updateLine(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = updateLineSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, lineId, ...f } = parsed.data;
  return editorResult(quotationId, "Line saved", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      const { line, route } = await lineIn(tx, quotationId, lineId);
      const taken = await invoicedQty(tx, line);
      if (f.qty < taken)
        throw new Refused(`${taken} already invoiced on this line; the quantity cannot go below.`);
      await tx
        .update(quotationLines)
        .set({
          description: f.description,
          qty: f.qty,
          sellCents: f.sellCents,
          costCents: f.costCents ?? line.costCents,
          vatCode: f.vatCode,
          priceSource: f.sellCents === line.sellCents ? line.priceSource : "manual",
          version: line.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(quotationLines.id, lineId));
      await resyncBookingOf(tx, route.id, user.id);
      await audit(tx, {
        action: "quotation.line.update",
        userId: user.id,
        entity: "quotation",
        entityId: quotationId,
        detail: { lineId, sellCents: f.sellCents, was: line.sellCents, qty: f.qty },
      });
    }),
  );
}

/** Taken off with a reason, never deleted; a line already invoiced is credited first. */
export async function removeLine(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = removeLineSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, lineId, reason } = parsed.data;
  return editorResult(quotationId, "Line removed", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      const { line, route } = await lineIn(tx, quotationId, lineId);
      if ((await invoicedQty(tx, line)) > 0)
        throw new Refused("This line is invoiced; credit it before taking it off.");
      await tx
        .update(quotationLines)
        .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
        .where(and(eq(quotationLines.id, lineId), isNull(quotationLines.archivedAt)));
      await resyncBookingOf(tx, route.id, user.id);
      await audit(tx, {
        action: "quotation.line.remove",
        userId: user.id,
        entity: "quotation",
        entityId: quotationId,
        detail: { lineId, description: line.description, reason },
      });
    }),
  );
}
