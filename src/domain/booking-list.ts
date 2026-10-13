import type { BillStatus } from "./invoicing";

/**
 * The bookings list as the office reads it (legacy bStatsPanel, B_STATS, B_COLS, bTopDests):
 * the figures it chooses to see over a period, the busiest destinations, and the columns it
 * chooses for the table. Integer cents (invariant 3); the rows are whatever the list shows
 * after its filters, a cancelled shipment never counted.
 */
export type FigureRow = {
  status: string;
  pod: string | null;
  boxes: number;
  valueCents: number;
  billedCents: number;
  billing: BillStatus;
  lateSteps: number;
};

export const BOOKING_FIGURE_DEFS = [
  { key: "count", label: "Bookings", kind: "count" },
  { key: "boxes", label: "Containers", kind: "count" },
  { key: "dests", label: "Destinations", kind: "count" },
  { key: "transit", label: "In transit", kind: "count" },
  { key: "arrived", label: "Arrived", kind: "count" },
  { key: "value", label: "Value", kind: "cents" },
  { key: "billed", label: "Invoiced", kind: "cents" },
  { key: "waiting", label: "Waiting for an invoice", kind: "count" },
  { key: "over", label: "Over-invoiced", kind: "count" },
  { key: "late", label: "Overdue steps", kind: "count" },
] as const;
export type BookingFigureKey = (typeof BOOKING_FIGURE_DEFS)[number]["key"];
export const DEFAULT_BOOKING_FIGURES: readonly BookingFigureKey[] = [
  "count",
  "boxes",
  "dests",
  "transit",
  "value",
  "late",
  "waiting",
];

export function bookingFigures(rows: readonly FigureRow[]): Record<BookingFigureKey, number> {
  const live = rows.filter((r) => r.status !== "cancelled");
  const sum = (f: (r: FigureRow) => number) => live.reduce((s, r) => s + f(r), 0);
  const n = (p: (r: FigureRow) => boolean) => live.filter(p).length;
  return {
    count: live.length,
    boxes: sum((r) => r.boxes),
    dests: new Set(live.map((r) => r.pod).filter(Boolean)).size,
    transit: n((r) => r.status === "in_transit"),
    arrived: n((r) => r.status === "arrived"),
    value: sum((r) => r.valueCents),
    billed: sum((r) => r.billedCents),
    waiting: n((r) => r.billing === "not" || r.billing === "partly"),
    over: n((r) => r.billing === "over"),
    late: sum((r) => r.lateSteps),
  };
}

/** The destinations shipped most, with their boxes (legacy bTopDests, by port of discharge). */
export function topDestinations(rows: readonly FigureRow[], n = 5) {
  const m = new Map<string, { label: string; n: number; boxes: number }>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const k = r.pod || "—";
    const e = m.get(k) ?? { label: k, n: 0, boxes: 0 };
    e.n++;
    e.boxes += r.boxes;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || b.boxes - a.boxes).slice(0, n);
}

/* ---- the table's columns (legacy B_COLS, B_COLS_DEFAULT) ---------------------------------- */

export const BOOKING_COLUMNS = [
  { key: "ref", label: "Our reference" },
  { key: "kind", label: "Export / Import" },
  { key: "status", label: "Status" },
  { key: "client", label: "Customer" },
  { key: "route", label: "Route" },
  { key: "load", label: "Loading address" },
  { key: "loadDate", label: "Loading date" },
  { key: "mode", label: "Loading mode" },
  { key: "trucker", label: "Trucker" },
  { key: "carrier", label: "Shipping line" },
  { key: "bookingNo", label: "Carrier booking n°" },
  { key: "blNo", label: "B/L n°" },
  { key: "boxes", label: "Containers" },
  { key: "vessel", label: "Vessel · voyage" },
  { key: "portCutOff", label: "Port cut-off" },
  { key: "vgmClosing", label: "VGM closing" },
  { key: "customsClosing", label: "Customs closing" },
  { key: "siClosing", label: "Shipping instruction" },
  { key: "etd", label: "ETD" },
  { key: "eta", label: "ETA" },
  { key: "steps", label: "Open steps" },
  { key: "value", label: "Value" },
  { key: "billing", label: "Invoiced" },
] as const;
export type BookingColumnKey = (typeof BOOKING_COLUMNS)[number]["key"];
export const DEFAULT_BOOKING_COLUMNS: readonly BookingColumnKey[] = [
  "ref",
  "status",
  "client",
  "route",
  "loadDate",
  "bookingNo",
  "boxes",
  "portCutOff",
  "vgmClosing",
  "customsClosing",
  "siClosing",
  "etd",
  "eta",
  "steps",
  "value",
  "billing",
];

/** The keys asked for in a URL value ("a,b,c"; "none" = nothing), or the defaults. */
export function parsePicks<K extends string>(
  all: readonly { key: K }[],
  defaults: readonly K[],
  param: unknown,
): K[] {
  if (param === "none") return [];
  if (typeof param !== "string" || !param) return [...defaults];
  const asked = new Set(param.split(","));
  const keys = all.map((d) => d.key).filter((k) => asked.has(k));
  return keys.length ? keys : [...defaults];
}

/** A closing past while the box has not sailed is late (legacy cutCell). */
export const closingLate = (day: string | null, status: string, today: string) =>
  !!day && day < today && ["quote", "sent", "confirmed"].includes(status);
