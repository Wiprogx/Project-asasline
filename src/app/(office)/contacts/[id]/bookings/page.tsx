import type { Metadata } from "next";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { listBookings } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Bookings" };

/** Every booking the contact is a party on: customer, payer, shipper, consignee or notify. */
export default async function ContactBookingsPage({
  params,
}: PageProps<"/contacts/[id]/bookings">) {
  await requirePagePermission("app.bookings");
  const { id } = await params;
  const rows = await listBookings({ contactId: id, cancelled: true });
  return <BookingsTable rows={rows} />;
}
