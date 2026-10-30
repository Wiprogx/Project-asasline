import "server-only";
import { and, desc, eq, ilike, ne, or, type SQL, sql } from "drizzle-orm";
import { billMatches, billStatus, type BillFilter } from "@/domain/invoicing";
import type { BookingStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { isPartyOn } from "@/server/booking-parties";
import { cached, tags } from "@/server/cache/cache";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { portCodeOf, portMatches } from "@/server/port-sql";
import { readRuleBook } from "@/server/rule-book";
import { bookings, contacts } from "@/server/db/schema";

/** The most serious open alert of a booking, then the newest (domain/alerts headline). */
const headlineOf = sql<string | null>`(select a.level || '|' || a.text from booking_alerts a
  where a.booking_id = ${bookings.id} and a.resolved_at is null
  order by case a.level when 'urgent' then 0 when 'alert' then 1 else 2 end, a.created_at desc limit 1)`;
/** The destination's lines sold: qty × boxes for a per-container line, terms bill nothing. */
const valueOf = sql<number>`(select coalesce(sum(ql.qty * (case when ql.per_box then greatest(1, qr.boxes) else 1 end) * ql.sell_cents), 0)
  from quotation_lines ql join quotation_routes qr on qr.id = ql.route_id
  where ql.route_id = ${bookings.quotationRouteId} and ql.archived_at is null and ql.condition = false and ql.sell_cents > 0)::int`;
/** What issued invoices took of the quotation's lines, credit notes given back (legacy billedAmount; extras added by hand are on top). */
const billedOf = sql<number>`(select coalesce(sum((case when i.kind = 'credit' then -1 else 1 end) * il.qty * il.unit_cents), 0)
  from invoice_lines il join invoices i on i.id = il.invoice_id
  where i.booking_id = ${bookings.id} and i.status = 'issued' and i.kind <> 'bill' and il.archived_at is null and il.source_key like 'q:%')::int`;
const liveBoxes = sql`from containers c where c.booking_id = ${bookings.id} and c.archived_at is null`;
/** Each live box's number in order, "" while it is to follow (legacy boxes column). */
const boxNosOf = sql<
  string[]
>`array(select coalesce(c.number, '') ${liveBoxes} order by c.position)`;
const boxLoadsOf = sql<
  string[]
>`array(select distinct c.load_address ${liveBoxes} and c.load_address is not null)`;
const boxModesOf = sql<
  string[]
>`array(select distinct c.loading_mode ${liveBoxes} and c.loading_mode is not null)`;
const truckersOf = sql<string[]>`array(select distinct t.name from containers c
  join contacts t on t.id = coalesce(c.transporter_id, ${bookings.transporterId})
  where c.booking_id = ${bookings.id} and c.archived_at is null)`;
const carrierOf = sql<
  string | null
>`(select s.name from contacts s where s.id = ${bookings.shippingCoId})`;
const stepsOf = (today: string) =>
  sql<string>`(select count(*) || '|' || count(*) filter (where a.due < ${today}::date) from activities a
    where a.link_kind = 'booking' and a.link_id = ${bookings.id} and a.state = 'open')`;
/**
 * Papers in / papers needed (legacy docs column): the steps of rules closed by a document,
 * per box for a per-box rule (key CODE#box), withdrawn ones not counted.
 */
const docsOf = (codes: readonly string[]) =>
  codes.length
    ? sql<string>`(select count(*) filter (where a.state = 'done') || '|' || count(*) from activities a
        where a.link_kind = 'booking' and a.link_id = ${bookings.id} and a.state <> 'withdrawn'
        and split_part(a.rule_code, '#', 1) in (${sql.join(
          codes.map((c) => sql`${c}`),
          sql`, `,
        )}))`
    : sql<string>`'0|0'`;
/** The day a booking counts in a period: its sailing, else its loading, else today (legacy bDate). */
const countedOn = (today: string) =>
  sql`coalesce(${bookings.etd}, ${bookings.loadDate}, ${today}::date)`;

export type ListScope = {
  q?: string;
  status?: BookingStatus;
  kind?: "export" | "import" | "both";
  carrierId?: string;
  period?: { from: string; to: string } | null;
  /** true: every status, cancelled ones too (the list's own chips sort them). */
  cancelled?: boolean;
  contactId?: string;
  billing?: BillFilter;
};

/** Everything the shipment knows, searched at once (legacy bookingHay). */
function searchWhere(q: string): SQL {
  const like = `%${q}%`;
  const b = bookings;
  return or(
    ...[b.ref, b.carrierBookingNo, b.blNo, b.vesselName, b.voyage].map((c) => ilike(c, like)),
    portMatches(b.polId, like),
    portMatches(b.podId, like),
    ...[b.commodity, b.terminal, b.pickupDepot, b.loadAddress].map((c) => ilike(c, like)),
    ilike(contacts.name, like),
    sql`exists (select 1 from contacts p where p.name ilike ${like} and p.id in (${b.payerId}, ${b.shipperId}, ${b.consigneeId}, ${b.notifyId}, ${b.docCheckId}, ${b.shippingCoId}, ${b.transporterId}, ${b.destForwarderId}, ${b.forwarderId}, ${b.customsAgentId}))`,
    sql`exists (select 1 ${liveBoxes} and (c.number ilike ${like} or c.load_address ilike ${like}
      or c.bl_description ilike ${like}
      or exists (select 1 from container_seals s where s.container_id = c.id and s.archived_at is null and s.number ilike ${like})
      or exists (select 1 from container_hs_lines h where h.container_id = c.id and h.archived_at is null and h.code ilike ${like})))`,
  )!;
}

function scopeWhere(s: ListScope, today: string): SQL | undefined {
  const q = s.q?.trim() ?? "";
  const status = s.status
    ? eq(bookings.status, s.status)
    : s.cancelled
      ? undefined
      : ne(bookings.status, "cancelled");
  return and(
    status,
    // A contact's bookings: every one it is on, in any role (domain/booking-parties).
    s.contactId ? isPartyOn(s.contactId) : undefined,
    s.kind ? eq(bookings.kind, s.kind) : undefined,
    s.carrierId ? eq(bookings.shippingCoId, s.carrierId) : undefined,
    s.period
      ? sql`${countedOn(today)} between ${s.period.from}::date and ${s.period.to}::date`
      : undefined,
    q ? searchWhere(q) : undefined,
  );
}

const scopeKey = (s: ListScope, today: string) =>
  [s.status, s.cancelled, s.contactId, s.kind, s.carrierId, s.period?.from, s.period?.to, today]
    .map((v) => v ?? "*")
    .concat((s.q ?? "").trim().toLowerCase())
    .join(":");

async function selectRows(s: ListScope, today: string, fileCodes: readonly string[]) {
  const b = bookings;
  const rows = await db
    .select({
      id: b.id,
      ref: b.ref,
      status: b.status,
      kind: b.kind,
      clientName: contacts.name,
      pol: portCodeOf(b.polId),
      pod: portCodeOf(b.podId),
      loadAddress: b.loadAddress,
      loadDate: b.loadDate,
      loadTime: b.loadTime,
      loadingMode: b.loadingMode,
      carrierName: carrierOf,
      carrierBookingNo: b.carrierBookingNo,
      blNo: b.blNo,
      vesselName: b.vesselName,
      voyage: b.voyage,
      portCutOff: b.portCutOff,
      vgmClosing: b.vgmClosing,
      customsClosing: b.customsClosing,
      siClosing: b.siClosing,
      etd: b.etd,
      eta: b.eta,
      boxNos: boxNosOf,
      boxLoads: boxLoadsOf,
      boxModes: boxModesOf,
      truckers: truckersOf,
      steps: stepsOf(today),
      docs: docsOf(fileCodes),
      valueCents: valueOf,
      billedCents: billedOf,
      alert: headlineOf,
    })
    .from(b)
    .innerJoin(contacts, eq(contacts.id, b.clientId))
    .where(scopeWhere(s, today))
    .orderBy(desc(b.ref))
    .limit(500);
  return rows.map(({ steps, docs, boxLoads, boxModes, ...r }) => {
    const [open, late] = steps.split("|").map(Number);
    const [docsIn, docsNeeded] = docs.split("|").map(Number);
    return {
      ...r,
      // A box's own detail wins; the booking's stands in when no box says one (legacy boxValues).
      loads: boxLoads.length ? boxLoads : r.loadAddress ? [r.loadAddress] : [],
      modes: boxModes.length ? boxModes : r.loadingMode ? [r.loadingMode] : [],
      boxes: r.boxNos.length,
      openSteps: open,
      lateSteps: late,
      docsIn,
      docsNeeded,
      billing: billStatus(r.valueCents, r.billedCents),
    };
  });
}

export type BookingRow = Awaited<ReturnType<typeof selectRows>>[number];

/** The bookings list, filtered as asked; Redis-cached for 30 s under the bookings tag. */
export async function listBookings(s: ListScope = {}): Promise<BookingRow[]> {
  await requirePermission("app.bookings");
  const today = officeToday();
  // The rules closed by a document (need "file", the default), as the Documents tab counts them.
  const fileCodes = (await readRuleBook())
    .filter((r) => (r.need ?? "file") === "file")
    .map((r) => r.code);
  const rows = await cached(
    `bookings:list:v3:${scopeKey(s, today)}:${fileCodes.join(",")}`,
    { ttlSeconds: 30, tags: [tags.bookings] },
    () => selectRows(s, today, fileCodes),
  );
  return rows.filter((r) => billMatches(r.billing, s.billing));
}

/** The shipping lines the office books with, for the list's carrier filter. */
export async function listCarriers() {
  await requirePermission("app.bookings");
  return cached("bookings:carriers", { ttlSeconds: 300, tags: [tags.bookings] }, () =>
    db
      .selectDistinct({ id: contacts.id, name: contacts.name })
      .from(bookings)
      .innerJoin(contacts, eq(contacts.id, bookings.shippingCoId))
      .orderBy(contacts.name),
  );
}
