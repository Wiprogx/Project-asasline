import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { buttonVariants } from "@/components/ui/button";
import { periodScope } from "@/domain/periods";
import { may } from "@/domain/permissions";
import { BookingColumns } from "@/features/bookings/components/booking-columns";
import { BookingsFilters } from "@/features/bookings/components/bookings-filters";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { parseBookingListParams } from "@/features/bookings/list-params";
import { listBookings, listCarriers } from "@/features/bookings/list-queries";
import { narrowBookings, sortBookings } from "@/features/bookings/list-view";
import { bookingView } from "@/features/bookings/view-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  const user = await requirePagePermission("app.bookings");
  const params = parseBookingListParams(await searchParams);
  const today = officeToday();
  const now = periodScope(params.period, today);
  const [found, carriers, view] = await Promise.all([
    listBookings({
      q: params.q,
      kind: params.kind,
      carrierId: params.carrier,
      billing: params.billing,
      period: now,
      cancelled: true,
    }),
    listCarriers(),
    bookingView(),
  ]);
  // The chips count every status; the table shows the one asked for, the cancelled ones only when asked.
  const all = narrowBookings(found, params);
  const rows = sortBookings(
    all.filter((r) => (params.status ? r.status === params.status : r.status !== "cancelled")),
    params,
  );
  const periodLabel = now ? `${now.label} · ${now.from} → ${now.to}` : "All time";
  return (
    <>
      {/* The title, its button, the search and the filters stay under the office header while the list scrolls. */}
      <div className="sticky top-12 z-10 -mx-4 -mt-4 mb-4 grid gap-3 border-b bg-background/95 px-4 pt-4 pb-3 backdrop-blur md:-mx-6 md:-mt-6 md:px-6 md:pt-6">
        <PageHeader
          title="Bookings"
          description={`${rows.length} bookings · ${periodLabel}`}
          actions={
            may(user, "bookings.edit") && (
              <Link href="/bookings/new" className={buttonVariants({ size: "sm" })}>
                New booking
              </Link>
            )
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-64 flex-1">
            <SearchInput placeholder="Ref, customer, consignee, container, seal, vessel, B/L…" />
          </div>
          <BookingColumns shown={view.columns} />
        </div>
        <BookingsFilters params={params} all={all} carriers={carriers} periodLabel={periodLabel} />
      </div>
      <BookingsTable rows={rows} columns={view.columns} widths={view.widths} today={today} />
    </>
  );
}
