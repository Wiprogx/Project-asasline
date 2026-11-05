import { Chip, Taken } from "@/components/shared/filter-chip";
import { BILL_FILTER_LABEL, BILL_FILTERS } from "@/domain/invoicing";
import { PERIOD_KEYS, PERIOD_LABEL } from "@/domain/periods";
import {
  BOOKING_STATUS_META,
  BOOKING_STATUSES,
  type BookingStatus,
  SHIPMENT_KIND_LABEL,
} from "@/domain/shipments";
import { type BookingListParams, bookingsHref } from "../list-params";
import { BookingsSelects } from "./bookings-selects";

const kindWord = (k: keyof typeof SHIPMENT_KIND_LABEL) => SHIPMENT_KIND_LABEL[k].split(" — ")[0];

/**
 * What narrows the list (legacy fbar and bStatsPanel chips): the period, counted on the sailing
 * date; the status, each with its count; invoiced or not; export or import and the shipping
 * line; and the customer, status, type or destination a row's menu kept or left out.
 */
export function BookingsFilters({
  params,
  all,
  carriers,
  periodLabel,
}: {
  params: BookingListParams;
  /** The list in every status, for the chips' counts. */
  all: readonly { status: BookingStatus }[];
  carriers: { id: string; name: string }[];
  periodLabel: string;
}) {
  const live = all.filter((r) => r.status !== "cancelled").length;
  const taken = [
    params.client,
    params.pod,
    params.xclient,
    params.xstatus,
    params.xkind,
    params.xpod,
  ];
  return (
    <div className="grid gap-2">
      <nav aria-label="Period" className="flex flex-wrap items-center gap-1.5">
        {PERIOD_KEYS.map((k) => (
          <Chip key={k} to={bookingsHref(params, { period: k })} on={params.period === k}>
            {PERIOD_LABEL[k]}
          </Chip>
        ))}
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      </nav>
      <nav aria-label="Status" className="flex flex-wrap gap-1.5">
        <Chip to={bookingsHref(params, { status: undefined })} on={!params.status}>
          All {live}
        </Chip>
        {BOOKING_STATUSES.map((s) => {
          const n = all.filter((r) => r.status === s).length;
          if (s === "cancelled" && !n) return null;
          return (
            <Chip key={s} to={bookingsHref(params, { status: s })} on={params.status === s}>
              {BOOKING_STATUS_META[s].label}
              {n ? ` ${n}` : ""}
            </Chip>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Invoiced" className="flex flex-wrap gap-1.5">
          <Chip to={bookingsHref(params, { billing: undefined })} on={!params.billing}>
            Invoiced or not
          </Chip>
          {BILL_FILTERS.map((b) => (
            <Chip key={b} to={bookingsHref(params, { billing: b })} on={params.billing === b}>
              {BILL_FILTER_LABEL[b]}
            </Chip>
          ))}
        </nav>
        <BookingsSelects carriers={carriers} />
      </div>
      {taken.some(Boolean) && (
        <nav aria-label="Filters" className="flex flex-wrap items-center gap-1.5">
          {params.client && (
            <Taken to={bookingsHref(params, { client: undefined })}>
              Customer: {params.client}
            </Taken>
          )}
          {params.pod && (
            <Taken to={bookingsHref(params, { pod: undefined })}>Destination: {params.pod}</Taken>
          )}
          {params.xclient && (
            <Taken to={bookingsHref(params, { xclient: undefined })}>
              Not customer: {params.xclient}
            </Taken>
          )}
          {params.xstatus && (
            <Taken to={bookingsHref(params, { xstatus: undefined })}>
              Not status: {BOOKING_STATUS_META[params.xstatus].label}
            </Taken>
          )}
          {params.xkind && (
            <Taken to={bookingsHref(params, { xkind: undefined })}>
              Not type: {kindWord(params.xkind)}
            </Taken>
          )}
          {params.xpod && (
            <Taken to={bookingsHref(params, { xpod: undefined })}>
              Not destination: {params.xpod}
            </Taken>
          )}
        </nav>
      )}
    </div>
  );
}
