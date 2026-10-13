import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BookingSummary } from "@/features/bookings/components/booking-summary";
import { CopiesCard } from "@/features/bookings/components/copies-card";
import { getBooking } from "@/features/bookings/queries";
import { truckerCopyGaps } from "@/domain/loading";
import { readBoxOwners, readContainerSpecs } from "@/server/container-config";
import { specsByType } from "@/domain/lookups";
import { scheduleConflict } from "@/domain/vessels";
import { TakeSailingDates } from "@/features/vessels/components/take-sailing-dates";
import { arrivalOf, routingLabel } from "@/domain/legs";
import { bookingLegs } from "@/features/vessels/queries";
import { AlertsCard } from "@/features/bookings/components/alerts-card";
import { bookingAlertsOf } from "@/features/bookings/alert-queries";
import { may } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";

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
  const [legs, alerts, user] = await Promise.all([
    bookingLegs(b.id),
    bookingAlertsOf(b.id),
    requireUser(),
  ]);
  // The register's arrival is the last leg's when there are legs (legacy finalVessel).
  const blocked = scheduleConflict(
    b,
    b.vessel && { etd: b.vessel.etd, eta: arrivalOf(b.vessel.eta, legs) },
  );
  return (
    <>
      <div className="pb-4">
        <AlertsCard
          bookingId={b.id}
          alerts={alerts}
          canEdit={b.status !== "cancelled" && may(user, "bookings.edit")}
        />
      </div>
      <BookingSummary
        b={b}
        specs={specsByType(specList)}
        owners={owners}
        routing={routingLabel({ name: b.vesselName, voyage: b.voyage }, legs)}
      />
      {b.status !== "cancelled" && (
        <div className="grid gap-4 pt-4 lg:grid-cols-2">
          <CopiesCard
            bookingId={b.id}
            blocked={blocked}
            fix={b.vessel && <TakeSailingDates bookingId={b.id} vesselId={b.vessel.id} />}
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
