import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BookingSummary } from "@/features/bookings/components/booking-summary";
import { CopiesCard } from "@/features/bookings/components/copies-card";
import { getBooking } from "@/features/bookings/queries";
import { truckerCopyGaps } from "@/domain/loading";
import { readBoxOwners, readContainerSpecs } from "@/server/container-config";
import { specsByType } from "@/domain/lookups";

export async function generateMetadata({ params }: PageProps<"/bookings/[id]">): Promise<Metadata> {
  const id = z.uuid().safeParse((await params).id);
  const b = id.success ? await getBooking(id.data) : null;
  return { title: b ? `${b.ref} · ${b.pol ?? "?"} → ${b.pod ?? "?"}` : "Booking" };
}

/** The layout already validated the id and the permission; getBooking is request-cached. */
export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const [b, specList, owners] = await Promise.all([
    getBooking((await params).id),
    readContainerSpecs(),
    readBoxOwners(),
  ]);
  if (!b) notFound();
  return (
    <>
      <BookingSummary b={b} specs={specsByType(specList)} owners={owners} />
      {b.status !== "cancelled" && (
        <div className="grid gap-4 pt-4 lg:grid-cols-2">
          <CopiesCard
            bookingId={b.id}
            boxes={b.containers.map((c) => ({
              id: c.id,
              number: c.number,
              gaps: truckerCopyGaps({ ...b, boxCount: b.containers.length }, c),
            }))}
          />
        </div>
      )}
    </>
  );
}
