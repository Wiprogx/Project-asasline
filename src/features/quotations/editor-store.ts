import "server-only";
import { and, eq, isNull, like, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { remainingQty } from "@/domain/invoicing";
import { type ActionResult, fail } from "@/lib/action-result";
import { invalidateTags, tags } from "@/server/cache/cache";
import type { DbOrTx } from "@/server/db/client";
import {
  bookingFiles,
  bookings,
  invoiceLines,
  invoices,
  quotationLines,
  quotationRoutes,
  quotations,
} from "@/server/db/schema";
import { priceOf } from "@/server/pricing";
import { syncBookingRules } from "@/server/rules-sync";
import { ConflictError, updateVersioned } from "@/server/versioned";

// Internal to the quotation editor: the actions call these after their permission check.

/** A refusal the person can act on, as opposed to a conflict with a colleague. */
export class Refused extends Error {}

/**
 * Every change to a quotation's routes or lines goes through the quotation's version: a
 * colleague's edit in between is a conflict, never overwritten. A cancelled one is frozen.
 */
export async function touchQuotation(tx: DbOrTx, id: string, version: number, userId: string) {
  const [q] = await tx.select().from(quotations).where(eq(quotations.id, id));
  if (!q) throw new Refused("This quotation no longer exists.");
  if (q.status === "cancelled") throw new Refused("A cancelled quotation cannot be changed.");
  await updateVersioned(tx, quotations, id, version, { updatedBy: userId }, "This quotation");
  return q;
}

export async function routeIn(tx: DbOrTx, quotationId: string, routeId: string) {
  const [r] = await tx
    .select()
    .from(quotationRoutes)
    .where(and(eq(quotationRoutes.id, routeId), eq(quotationRoutes.quotationId, quotationId)));
  if (!r) throw new Refused("This destination is not on the quotation.");
  return r;
}

export async function lineIn(tx: DbOrTx, quotationId: string, lineId: string) {
  const [row] = await tx
    .select({ line: quotationLines, route: quotationRoutes })
    .from(quotationLines)
    .innerJoin(quotationRoutes, eq(quotationRoutes.id, quotationLines.routeId))
    .where(and(eq(quotationLines.id, lineId), eq(quotationRoutes.quotationId, quotationId)));
  if (!row || row.line.archivedAt) throw new Refused("This line is no longer on the quotation.");
  return row;
}

/** The live booking a destination became, if any. */
export async function bookingOn(tx: DbOrTx, routeId: string) {
  const [b] = await tx
    .select({ id: bookings.id, ref: bookings.ref })
    .from(bookings)
    .where(
      and(
        eq(bookings.quotationRouteId, routeId),
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
      ),
    );
  return b ?? null;
}

/** How much of a line issued invoices took, credit notes given back. */
export async function invoicedQty(tx: DbOrTx, line: { id: string; qty: number }) {
  const billed = await tx
    .select({ qty: invoiceLines.qty, kind: invoices.kind })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
    .where(
      and(
        eq(invoiceLines.sourceKey, `q:${line.id}`),
        eq(invoices.status, "issued"),
        isNull(invoiceLines.archivedAt),
      ),
    );
  return line.qty - remainingQty(line.qty, billed);
}

/**
 * Once a Certiweight certificate is filed on a booking of this destination, the weighing was
 * done and will be invoiced: the line cannot be taken off the quotation (legacy certiLocked).
 */
export async function certificateFiled(tx: DbOrTx, routeId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: bookingFiles.id })
    .from(bookingFiles)
    .innerJoin(bookings, eq(bookings.id, bookingFiles.bookingId))
    .where(
      and(
        eq(bookings.quotationRouteId, routeId),
        ne(bookings.status, "cancelled"),
        isNull(bookingFiles.archivedAt),
        eq(bookingFiles.stage, "final"),
        like(bookingFiles.ruleCode, "CERTIWEIGHT%"),
      ),
    )
    .limit(1);
  return !!row;
}

/** What a booked destination sold may have changed: its "only if sold" steps follow. */
export async function resyncBookingOf(tx: DbOrTx, routeId: string, userId: string) {
  const b = await bookingOn(tx, routeId);
  if (b) await syncBookingRules(tx, b.id, userId);
}

type PricedLine = {
  q: { id: string; clientId: string };
  routeId: string;
  itemId: string;
  qty: number;
  position: number;
  day: string;
  userId: string;
  /** Prices typed by the person; a sell different from the looked-up one makes it "manual". */
  typed?: { sellCents?: number; costCents?: number };
};

/** A catalogue item as a line, priced for the customer: agreement → last price → catalogue. */
export async function insertPricedLine(tx: DbOrTx, p: PricedLine) {
  const priced = await priceOf(tx, {
    clientId: p.q.clientId,
    itemId: p.itemId,
    day: p.day,
    exceptQuotationId: p.q.id,
  });
  if (!priced) throw new Refused("That item is no longer in the catalogue.");
  const { item, label, price } = priced;
  const sell = p.typed?.sellCents ?? price.sellCents;
  await tx.insert(quotationLines).values({
    routeId: p.routeId,
    position: p.position,
    itemId: item.id,
    description: label,
    qty: p.qty,
    sellCents: sell,
    costCents: p.typed?.costCents ?? price.buyCents,
    vatCode: item.vatCode,
    priceSource: sell === price.sellCents ? price.source : "manual",
    createdBy: p.userId,
  });
  return { item, label, price };
}

/** Runs an editor change; conflicts and refusals come back as the form's error. */
export async function editorResult(
  quotationId: string,
  message: string,
  change: () => Promise<unknown>,
): Promise<ActionResult> {
  try {
    await change();
  } catch (e) {
    if (e instanceof ConflictError || e instanceof Refused) return fail(e.message);
    throw e;
  }
  await invalidateTags(tags.quotations, tags.bookings);
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/bookings", "layout");
  return { ok: true, data: undefined, message };
}
