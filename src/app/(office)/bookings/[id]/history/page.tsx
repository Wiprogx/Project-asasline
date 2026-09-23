import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { BookingHistory } from "@/features/bookings/components/booking-history";
import { bookingHistory } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Booking history" };

export default async function BookingHistoryPage({ params }: PageProps<"/bookings/[id]/history">) {
  await requirePagePermission("app.bookings");
  const rows = await bookingHistory((await params).id);
  return (
    <Card>
      <CardContent className="pt-4">
        <BookingHistory rows={rows} />
      </CardContent>
    </Card>
  );
}
