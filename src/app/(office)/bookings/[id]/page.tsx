import { notFound } from "next/navigation";
import { BookingSummary } from "@/features/bookings/components/booking-summary";
import { getBooking } from "@/features/bookings/queries";

/** The layout already validated the id and the permission; getBooking is request-cached. */
export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const b = await getBooking((await params).id);
  if (!b) notFound();
  return <BookingSummary b={b} />;
}
