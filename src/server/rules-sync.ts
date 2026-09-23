import "server-only";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { BookingFacts } from "@/domain/rules/engine";
import { planChain, type PlanStep, syncDiff } from "@/domain/rules/plan";
import { audit } from "./audit";
import type { DbOrTx } from "./db/client";
import { activities, bookings, quotationLines, quotationRoutes } from "./db/schema";
import { readHolidays, readRuleBook } from "./rule-book";

type BookingRow = typeof bookings.$inferSelect;

export function factsOf(b: BookingRow, soldLines: readonly string[] | null = null): BookingFacts {
  return {
    soldLines,
    ref: b.ref,
    kind: b.kind,
    pol: b.pol,
    pod: b.pod,
    docType: b.docType,
    anchors: {
      loading: b.loadDate,
      customs: b.customsClosing,
      vgm: b.vgmClosing,
      si: b.siClosing,
      portcut: b.portCutOff,
      etd: b.etd,
      eta: b.eta,
    },
  };
}

/** What the booking's quotation sold: its lines' descriptions (declined routes left out). */
async function soldLinesOf(tx: DbOrTx, quotationId: string | null): Promise<string[] | null> {
  if (!quotationId) return null;
  const rows = await tx
    .select({ description: quotationLines.description })
    .from(quotationLines)
    .innerJoin(quotationRoutes, eq(quotationRoutes.id, quotationLines.routeId))
    .where(
      and(
        eq(quotationRoutes.quotationId, quotationId),
        eq(quotationRoutes.declined, false),
        isNull(quotationLines.archivedAt),
      ),
    );
  return rows.map((r) => r.description);
}

async function ruleTasks(tx: DbOrTx, bookingId: string) {
  return tx
    .select({
      id: activities.id,
      ruleCode: activities.ruleCode,
      state: activities.state,
      due: activities.due,
    })
    .from(activities)
    .where(
      and(
        eq(activities.linkKind, "booking"),
        eq(activities.linkId, bookingId),
        isNotNull(activities.ruleCode),
      ),
    );
}

/** The chain of one booking as it stands (for the Documents tab). */
export async function bookingChain(tx: DbOrTx, b: BookingRow): Promise<PlanStep[]> {
  const [book, holidays, tasks, sold] = await Promise.all([
    readRuleBook(),
    readHolidays(),
    ruleTasks(tx, b.id),
    soldLinesOf(tx, b.quotationId),
  ]);
  const settled = new Set(tasks.filter((t) => t.state !== "open").map((t) => t.ruleCode!));
  return planChain(book, factsOf(b, sold), holidays, settled);
}

/**
 * Brings a booking's rule tasks in line with the rule book: opens what may start, redates
 * what moved, withdraws what no longer applies. Idempotent — call it after anything that can
 * change the chain (a new booking, an edited date or port, a step done or undone, a rule
 * edited). A cancelled booking is left alone: cancelling already withdrew its tasks.
 */
export async function syncBookingRules(tx: DbOrTx, bookingId: string, userId: string | null) {
  const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b || b.status === "cancelled") return;
  const tasks = await ruleTasks(tx, bookingId);
  const diff = syncDiff(
    await bookingChain(tx, b),
    tasks.map((t) => ({ ...t, ruleCode: t.ruleCode! })),
  );

  for (const c of diff.create)
    await tx.insert(activities).values({
      title: c.title,
      due: c.due,
      role: c.role,
      ruleCode: c.ruleCode,
      blocking: c.blocking,
      linkKind: "booking",
      linkId: bookingId,
      createdBy: userId,
      updatedBy: userId,
    });
  for (const r of diff.redate)
    await tx
      .update(activities)
      .set({ due: r.due, version: sql`${activities.version} + 1`, updatedAt: new Date() })
      .where(and(eq(activities.id, r.id), eq(activities.state, "open")));
  for (const w of diff.withdraw)
    await tx
      .update(activities)
      .set({
        state: "withdrawn",
        withdrawReason: w.reason,
        version: sql`${activities.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, w.id), eq(activities.state, "open")));

  if (diff.create.length || diff.redate.length || diff.withdraw.length)
    await audit(tx, {
      action: "rules.sync",
      userId,
      entity: "booking",
      entityId: bookingId,
      detail: {
        opened: diff.create.map((c) => c.ruleCode),
        redated: diff.redate.length,
        withdrawn: diff.withdraw.length,
      },
    });
}

/** After the rule book or the holidays change: every live booking follows. */
export async function syncAllBookings(tx: DbOrTx, userId: string | null) {
  const live = await tx
    .select({ id: bookings.id })
    .from(bookings)
    .where(ne(bookings.status, "cancelled"));
  for (const b of live) await syncBookingRules(tx, b.id, userId);
  return live.length;
}
