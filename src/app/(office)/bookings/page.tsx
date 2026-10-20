import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { UrlPicks } from "@/components/shared/url-picks";
import { buttonVariants } from "@/components/ui/button";
import {
  BOOKING_COLUMNS,
  BOOKING_FIGURE_DEFS,
  DEFAULT_BOOKING_COLUMNS,
  DEFAULT_BOOKING_FIGURES,
} from "@/domain/booking-list";
import { parsePicks } from "@/domain/picks";
import { BILL_FILTERS } from "@/domain/invoicing";
import { parsePeriodKey, periodScope } from "@/domain/periods";
import { may } from "@/domain/permissions";
import { BOOKING_STATUSES, SHIPMENT_KINDS } from "@/domain/shipments";
import { BookingsFigures } from "@/features/bookings/components/bookings-figures";
import { BookingsFilters } from "@/features/bookings/components/bookings-filters";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { listBookings, listCarriers } from "@/features/bookings/list-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Bookings" };

const one = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  const user = await requirePagePermission("app.bookings");
  const sp = await searchParams;
  const status = BOOKING_STATUSES.find((s) => s === sp.status);
  const billing = BILL_FILTERS.find((b) => b === sp.billing);
  const kind = SHIPMENT_KINDS.find((k) => k === sp.kind);
  const [q, carrierId] = [one(sp.q), one(sp.carrier)];
  const period = parsePeriodKey(sp.period);
  const today = officeToday();
  const now = periodScope(period, today);
  const cmp = sp.cmp === "prev" && period !== "all";
  const scope = { q, kind, carrierId, billing, cancelled: true };
  const [all, before, carriers] = await Promise.all([
    listBookings({ ...scope, period: now }),
    cmp ? listBookings({ ...scope, period: periodScope(period, today, 1) }) : null,
    listCarriers(),
  ]);
  // The chips count every status; the table and the figures show the one asked for.
  const pick = (rs: typeof all) =>
    rs.filter((r) => (status ? r.status === status : r.status !== "cancelled"));
  const rows = pick(all);
  const columns = parsePicks(BOOKING_COLUMNS, DEFAULT_BOOKING_COLUMNS, sp.cols);
  return (
    <>
      <PageHeader
        title="Bookings"
        description={`${rows.length} shown · ${now ? `${now.label} · ${now.from} → ${now.to}` : "all time"}`}
        actions={
          may(user, "bookings.edit") && (
            <Link href="/bookings/new" className={buttonVariants({ size: "sm" })}>
              New booking
            </Link>
          )
        }
      />
      <div className="mb-3 grid gap-2">
        <SearchInput placeholder="Ref, customer, consignee, container, seal, vessel, B/L…" />
        <BookingsFilters carriers={carriers} />
      </div>
      <BookingsFigures
        all={all}
        rows={rows}
        before={before && pick(before)}
        shown={parsePicks(BOOKING_FIGURE_DEFS, DEFAULT_BOOKING_FIGURES, sp.figs)}
        params={{
          q,
          status,
          billing,
          kind,
          carrier: carrierId,
          period: now ? period : undefined,
          cmp: cmp ? "prev" : undefined,
          figs: one(sp.figs),
          cols: one(sp.cols),
        }}
        periodLabel={now?.label ?? "All time"}
      />
      <div className="mb-2">
        <UrlPicks
          param="cols"
          title="Choose the columns"
          defs={BOOKING_COLUMNS}
          defaults={DEFAULT_BOOKING_COLUMNS}
          shown={columns}
          fixed={["ref"]}
        />
      </div>
      <BookingsTable rows={rows} columns={columns} today={today} />
    </>
  );
}
