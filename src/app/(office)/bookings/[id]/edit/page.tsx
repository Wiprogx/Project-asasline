import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookingDetailsForm } from "@/features/bookings/components/booking-details-form";
import { toDetailsValues } from "@/features/bookings/form-values";
import { bookingPlaces } from "@/features/bookings/place-queries";
import { getBooking } from "@/features/bookings/queries";
import { NewPlaceDialog } from "@/features/contacts/components/new-place-dialog";
import { contactOptions } from "@/features/contacts/queries";
import { BookingLegs } from "@/features/vessels/components/booking-legs";
import { BookingSailing } from "@/features/vessels/components/booking-sailing";
import { bookingLegs, sailingOptions } from "@/features/vessels/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readCountries } from "@/server/countries";
import { liveLookups, lookupOptions } from "@/server/lookups";

export const metadata: Metadata = { title: "Edit booking" };

export default async function EditBookingPage({ params }: PageProps<"/bookings/[id]/edit">) {
  await requirePagePermission("bookings.edit");
  const { id } = await params;
  const [b, contacts, docTypes] = await Promise.all([
    getBooking(id),
    contactOptions(),
    lookupOptions("doc-types", null),
  ]);
  if (!b) notFound();
  if (b.status === "cancelled") redirect(`/bookings/${id}`);
  const [sailings, legs, places, countries, salutations] = await Promise.all([
    sailingOptions(officeToday(), { pol: b.pol, pod: b.pod }),
    bookingLegs(id),
    bookingPlaces(),
    readCountries(),
    liveLookups("salutations"),
  ]);
  const lists = { countries, salutations };

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
        docTypes={docTypes}
        places={places}
        dialogs={{
          depot: <NewPlaceDialog lists={lists} role="depot" />,
          terminal: <NewPlaceDialog lists={lists} role="terminal" />,
        }}
      />
    </div>
  );
}
