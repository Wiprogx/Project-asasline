import type { Metadata } from "next";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { listBookings } from "@/features/bookings/list-queries";
import { sortBookings } from "@/features/bookings/list-view";
import { bookingView } from "@/features/bookings/view-queries";
import { officeToday } from "@/server/clock";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Bookings" };

const one = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** Every booking the contact is a party on, in the person's own columns, ordered as asked. */
export default async function ContactBookingsPage({
  params,
  searchParams,
}: PageProps<"/contacts/[id]/bookings">) {
  await requirePagePermission("app.bookings");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [rows, view] = await Promise.all([
    listBookings({ contactId: id, cancelled: true }),
    bookingView(),
  ]);
  return (
    <BookingsTable
      rows={sortBookings(rows, { sort: one(sp.sort), dir: sp.dir === "desc" ? "desc" : undefined })}
      columns={view.columns}
      widths={view.widths}
      today={officeToday()}
      filterable={false}
    />
  );
}
