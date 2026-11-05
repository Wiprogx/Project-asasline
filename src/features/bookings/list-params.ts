import { BILL_FILTERS, type BillFilter } from "@/domain/invoicing";
import { parsePeriodKey, type PeriodKey } from "@/domain/periods";
import {
  BOOKING_STATUSES,
  type BookingStatus,
  SHIPMENT_KINDS,
  type ShipmentKind,
} from "@/domain/shipments";
import { hrefWith } from "@/lib/url";

/** The bookings list's URL, read once by the page and handed to its navs, chips and menus. */
export type BookingListParams = {
  q?: string;
  status?: BookingStatus;
  billing?: BillFilter;
  kind?: ShipmentKind;
  /** The shipping line's contact id (the select). */
  carrier?: string;
  period: PeriodKey;
  /** "Show similar" on a customer or a destination (its port of discharge). */
  client?: string;
  pod?: string;
  /** "Filter out" on a customer, a status, a type or a destination. */
  xclient?: string;
  xstatus?: BookingStatus;
  xkind?: ShipmentKind;
  xpod?: string;
  sort?: string;
  dir?: "desc";
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  typeof v === "string" && v ? v.slice(0, 200) : undefined;

export function parseBookingListParams(sp: Raw): BookingListParams {
  return {
    q: one(sp.q),
    status: BOOKING_STATUSES.find((s) => s === sp.status),
    billing: BILL_FILTERS.find((b) => b === sp.billing),
    kind: SHIPMENT_KINDS.find((k) => k === sp.kind),
    carrier: one(sp.carrier),
    period: parsePeriodKey(sp.period),
    client: one(sp.client),
    pod: one(sp.pod),
    xclient: one(sp.xclient),
    xstatus: BOOKING_STATUSES.find((s) => s === sp.xstatus),
    xkind: SHIPMENT_KINDS.find((k) => k === sp.xkind),
    xpod: one(sp.xpod),
    sort: one(sp.sort),
    dir: sp.dir === "desc" ? "desc" : undefined,
  };
}

/** The list with some of its parameters changed; the defaults leave the URL clean. */
export function bookingsHref(p: BookingListParams, patch: Partial<BookingListParams>): string {
  const n = { ...p, ...patch };
  return hrefWith(
    "/bookings",
    {
      q: n.q,
      status: n.status,
      billing: n.billing,
      kind: n.kind,
      carrier: n.carrier,
      period: n.period !== "all" ? n.period : undefined,
      client: n.client,
      pod: n.pod,
      xclient: n.xclient,
      xstatus: n.xstatus,
      xkind: n.xkind,
      xpod: n.xpod,
      sort: n.sort,
      dir: n.dir,
    },
    {},
  );
}
