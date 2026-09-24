import "server-only";
import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { BookingFacts } from "@/domain/rules/engine";
import { planChain, type PlanStep, syncDiff } from "@/domain/rules/plan";
import { type AuditEntry, auditMany } from "./audit";
import type { DbOrTx } from "./db/client";
import { activities, bookings, quotationLines } from "./db/schema";
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

type Task = {
  id: string;
  linkId: string | null;
  ruleCode: string | null;
  state: "open" | "done" | "withdrawn";
  due: string | null;
};
type Rules = {
  book: Awaited<ReturnType<typeof readRuleBook>>;
  holidays: Awaited<ReturnType<typeof readHolidays>>;
};

const CHUNK = 1000;
const chunks = <T>(xs: readonly T[]): T[][] =>
  Array.from({ length: Math.ceil(xs.length / CHUNK) }, (_, i) =>
    xs.slice(i * CHUNK, (i + 1) * CHUNK),
  );

async function ruleTasksOf(tx: DbOrTx, bookingIds: readonly string[]): Promise<Task[]> {
  const out: Task[] = [];
  for (const ids of chunks(bookingIds))
    out.push(
      ...(await tx
        .select({
          id: activities.id,
          linkId: activities.linkId,
          ruleCode: activities.ruleCode,
          state: activities.state,
          due: activities.due,
        })
        .from(activities)
        .where(
          and(
            eq(activities.linkKind, "booking"),
            inArray(activities.linkId, ids),
            isNotNull(activities.ruleCode),
          ),
        )),
    );
  return out;
}

/** What each destination sold: its live lines' descriptions, by route. */
async function soldLinesByRoute(tx: DbOrTx, routeIds: readonly string[]) {
  const byRoute = new Map<string, string[]>();
  for (const ids of chunks(routeIds)) {
    const rows = await tx
      .select({ routeId: quotationLines.routeId, description: quotationLines.description })
      .from(quotationLines)
      .where(and(inArray(quotationLines.routeId, ids), isNull(quotationLines.archivedAt)));
    for (const r of rows)
      byRoute.set(r.routeId, [...(byRoute.get(r.routeId) ?? []), r.description]);
  }
  return byRoute;
}

/** A booking with no quotation keeps every rule (null); a destination with no line sold nothing. */
const soldOf = (b: BookingRow, byRoute: Map<string, string[]>) =>
  b.quotationRouteId ? (byRoute.get(b.quotationRouteId) ?? []) : null;

const routesOf = (bs: readonly BookingRow[]) =>
  bs.flatMap((b) => (b.quotationRouteId ? [b.quotationRouteId] : []));

function chainOf(b: BookingRow, rules: Rules, tasks: readonly Task[], sold: string[] | null) {
  const settled = new Set(tasks.filter((t) => t.state !== "open").map((t) => t.ruleCode!));
  return planChain(rules.book, factsOf(b, sold), rules.holidays, settled);
}

async function readRules(): Promise<Rules> {
  const [book, holidays] = await Promise.all([readRuleBook(), readHolidays()]);
  return { book, holidays };
}

/** The chain of one booking as it stands (for the Documents tab). */
export async function bookingChain(tx: DbOrTx, b: BookingRow): Promise<PlanStep[]> {
  const [rules, tasks, sold] = await Promise.all([
    readRules(),
    ruleTasksOf(tx, [b.id]),
    soldLinesByRoute(tx, routesOf([b])),
  ]);
  return chainOf(b, rules, tasks, soldOf(b, sold));
}

type Plan = {
  create: (typeof activities.$inferInsert)[];
  redate: ReturnType<typeof syncDiff>["redate"];
  withdraw: ReturnType<typeof syncDiff>["withdraw"];
  audit: AuditEntry | null;
};

type SyncInput = {
  b: BookingRow;
  rules: Rules;
  tasks: Task[];
  sold: string[] | null;
  userId: string | null;
};

function planSync({ b, rules, tasks, sold, userId }: SyncInput): Plan {
  const diff = syncDiff(
    chainOf(b, rules, tasks, sold),
    tasks.map((t) => ({ ...t, ruleCode: t.ruleCode! })),
  );
  const changed = diff.create.length + diff.redate.length + diff.withdraw.length > 0;
  return {
    create: diff.create.map((c) => ({
      title: c.title,
      due: c.due,
      role: c.role,
      ruleCode: c.ruleCode,
      blocking: c.blocking,
      linkKind: "booking",
      linkId: b.id,
      createdBy: userId,
      updatedBy: userId,
    })),
    redate: diff.redate,
    withdraw: diff.withdraw,
    audit: changed
      ? {
          action: "rules.sync",
          userId,
          entity: "booking",
          entityId: b.id,
          detail: {
            opened: diff.create.map((c) => c.ruleCode),
            redated: diff.redate.length,
            withdrawn: diff.withdraw.length,
          },
        }
      : null,
  };
}

/** New steps and audit lines go in batches; a moved or withdrawn step is its own update. */
async function applyPlans(tx: DbOrTx, plans: readonly Plan[]) {
  for (const rows of chunks(plans.flatMap((p) => p.create)))
    await tx.insert(activities).values(rows);
  for (const r of plans.flatMap((p) => p.redate))
    await tx
      .update(activities)
      .set({ due: r.due, version: sql`${activities.version} + 1`, updatedAt: new Date() })
      .where(and(eq(activities.id, r.id), eq(activities.state, "open")));
  for (const w of plans.flatMap((p) => p.withdraw))
    await tx
      .update(activities)
      .set({
        state: "withdrawn",
        withdrawReason: w.reason,
        version: sql`${activities.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, w.id), eq(activities.state, "open")));
  await auditMany(
    tx,
    plans.flatMap((p) => (p.audit ? [p.audit] : [])),
  );
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
  const [rules, tasks, sold] = await Promise.all([
    readRules(),
    ruleTasksOf(tx, [b.id]),
    soldLinesByRoute(tx, routesOf([b])),
  ]);
  await applyPlans(tx, [planSync({ b, rules, tasks, sold: soldOf(b, sold), userId })]);
}

/**
 * After the rule book or the holidays change: every live booking follows. Read in bulk and
 * written in batches — one booking at a time took ~30 s at a few hundred bookings.
 */
export async function syncAllBookings(tx: DbOrTx, userId: string | null) {
  const live = await tx.select().from(bookings).where(ne(bookings.status, "cancelled"));
  if (live.length === 0) return 0;
  const [rules, tasks, sold] = await Promise.all([
    readRules(),
    ruleTasksOf(
      tx,
      live.map((b) => b.id),
    ),
    soldLinesByRoute(tx, routesOf(live)),
  ]);
  const tasksOf = new Map<string, Task[]>();
  for (const t of tasks) tasksOf.set(t.linkId ?? "", [...(tasksOf.get(t.linkId ?? "") ?? []), t]);
  await applyPlans(
    tx,
    live.map((b) =>
      planSync({ b, rules, tasks: tasksOf.get(b.id) ?? [], sold: soldOf(b, sold), userId }),
    ),
  );
  return live.length;
}
