import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BookingSummary } from "@/features/bookings/components/booking-summary";
import { CopiesCard } from "@/features/bookings/components/copies-card";
import { getBooking } from "@/features/bookings/queries";

export async function generateMetadata({ params }: PageProps<"/bookings/[id]">): Promise<Metadata> {
  const id = z.uuid().safeParse((await params).id);
  const b = id.success ? await getBooking(id.data) : null;
  return { title: b ? `${b.ref} · ${b.pol ?? "?"} → ${b.pod ?? "?"}` : "Booking" };
}

/** The layout already validated the id and the permission; getBooking is request-cached. */
export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const b = await getBooking((await params).id);
  if (!b) notFound();
  return (
    <>
      <BookingSummary b={b} />
      {b.status !== "cancelled" && (
        <div className="grid gap-4 pt-4 lg:grid-cols-2">
          <CopiesCard bookingId={b.id} boxes={b.containers} />
        </div>
      )}
    </>
  );
}
