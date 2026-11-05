import { type SortValue, sortRows } from "@/lib/table-view";
import type { BookingRow } from "./list-queries";
import type { BookingListParams } from "./list-params";

/** What each column sorts on: the value as the table shows it. */
const SORTS: Record<string, (r: BookingRow) => SortValue> = {
  ref: (r) => r.ref,
  kind: (r) => r.kind,
  status: (r) => r.status,
  client: (r) => r.clientName,
  route: (r) => (r.pol || r.pod ? `${r.pol ?? "?"} → ${r.pod ?? "?"}` : null),
  load: (r) => r.loads[0],
  loadDate: (r) => r.loadDate,
  mode: (r) => r.modes[0],
  trucker: (r) => r.truckers[0],
  carrier: (r) => r.carrierName,
  bookingNo: (r) => r.carrierBookingNo,
  blNo: (r) => r.blNo,
  boxes: (r) => r.boxes,
  vessel: (r) => r.vesselName,
  portCutOff: (r) => r.portCutOff,
  vgmClosing: (r) => r.vgmClosing,
  customsClosing: (r) => r.customsClosing,
  siClosing: (r) => r.siClosing,
  etd: (r) => r.etd,
  eta: (r) => r.eta,
  steps: (r) => r.openSteps,
  docs: (r) => r.docsIn,
  value: (r) => r.valueCents,
  billing: (r) => r.billing,
};

type Narrowing = Pick<
  BookingListParams,
  "client" | "xclient" | "xstatus" | "xkind" | "pod" | "xpod"
>;

/**
 * The rows a row's menu kept or left out ("Show similar", "Filter out"): by the customer's name,
 * the status, the type or the port of discharge. Narrowed here, over the rows the SQL returned.
 */
export function narrowBookings<R extends BookingRow>(rows: readonly R[], p: Narrowing): R[] {
  return rows.filter(
    (r) =>
      (!p.client || r.clientName === p.client) &&
      (!p.xclient || r.clientName !== p.xclient) &&
      (!p.xstatus || r.status !== p.xstatus) &&
      (!p.xkind || r.kind !== p.xkind) &&
      (!p.pod || r.pod === p.pod) &&
      (!p.xpod || r.pod !== p.xpod),
  );
}

/** The rows in the order asked (a stable sort, empty values last); no sort keeps the newest first. */
export function sortBookings<R extends BookingRow>(
  rows: readonly R[],
  p: Pick<BookingListParams, "sort" | "dir">,
): R[] {
  return sortRows(rows, SORTS as Record<string, (r: R) => SortValue>, {
    sort: p.sort ?? null,
    dir: p.dir ?? "asc",
  });
}
