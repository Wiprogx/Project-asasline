import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookingDetailsForm } from "@/features/bookings/components/booking-details-form";
import { toDetailsValues } from "@/features/bookings/form-values";
import { bookingPlaces } from "@/features/bookings/place-queries";
import { getBooking } from "@/features/bookings/queries";
import { contactOptions } from "@/features/contacts/queries";
import { BookingLegs } from "@/features/vessels/components/booking-legs";
import { BookingSailing } from "@/features/vessels/components/booking-sailing";
import { bookingLegs, sailingOptions } from "@/features/vessels/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readLoadingModes } from "@/server/loading-config";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Edit booking" };

export default async function EditBookingPage({ params }: PageProps<"/bookings/[id]/edit">) {
  await requirePagePermission("bookings.edit");
  const { id } = await params;
  const [b, contacts, modes, docTypes] = await Promise.all([
    getBooking(id),
    contactOptions(),
    readLoadingModes(),
    readConfig("docTypes"),
  ]);
  if (!b) notFound();
  if (b.status === "cancelled") redirect(`/bookings/${id}`);
  const [sailings, legs, places] = await Promise.all([
    sailingOptions(officeToday(), { pol: b.pol, pod: b.pod }),
    bookingLegs(id),
    bookingPlaces(),
  ]);

  const values = toDetailsValues(b);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Sailing</h2>
        </CardHeader>
        <CardContent>
          <BookingSailing bookingId={b.id} vesselId={b.vesselId} options={sailings} />
          {b.vesselId && (
            <div className="mt-3 border-t pt-3">
              <BookingLegs bookingId={b.id} legs={legs} options={sailings} />
            </div>
          )}
        </CardContent>
      </Card>
      <BookingDetailsForm
        key={b.version}
        values={values}
        contacts={contacts}
        modes={modes}
        docTypes={docTypes}
        places={places}
      />
    </div>
  );
}
