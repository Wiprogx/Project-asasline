import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { may } from "@/domain/permissions";
import { BOOKING_STATUS_META, BOOKING_STATUSES, type BookingStatus } from "@/domain/shipments";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { listBookings } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Bookings" };

const isStatus = (s: unknown): s is BookingStatus => BOOKING_STATUSES.includes(s as BookingStatus);

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  const user = await requirePagePermission("app.bookings");
  const sp = await searchParams;
  const status = isStatus(sp.status) ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const rows = await listBookings({ q, status });

  return (
    <>
      <PageHeader
        title="Bookings"
        description={status ? BOOKING_STATUS_META[status].label : `${rows.length} active`}
        actions={
          <>
            {status && (
              <Button variant="ghost" size="sm" render={<Link href="/bookings" />}>
                All active
              </Button>
            )}
            <Button variant="ghost" size="sm" render={<Link href="/bookings?status=cancelled" />}>
              Cancelled
            </Button>
            {may(user, "bookings.edit") && (
              <Button size="sm" render={<Link href="/bookings/new" />}>
                New booking
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Search SB ref, customer, carrier booking no, B/L, port…" />
      </div>
      <BookingsTable rows={rows} />
    </>
  );
}
