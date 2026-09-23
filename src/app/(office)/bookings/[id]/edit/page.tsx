import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookingDetailsForm } from "@/features/bookings/components/booking-details-form";
import { getBooking } from "@/features/bookings/queries";
import { contactOptions } from "@/features/contacts/queries";
import { BookingSailing } from "@/features/vessels/components/booking-sailing";
import { sailingOptions } from "@/features/vessels/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Edit booking" };

export default async function EditBookingPage({ params }: PageProps<"/bookings/[id]/edit">) {
  await requirePagePermission("bookings.edit");
  const { id } = await params;
  const [b, contacts] = await Promise.all([getBooking(id), contactOptions()]);
  if (!b) notFound();
  if (b.status === "cancelled") redirect(`/bookings/${id}`);
  const sailings = await sailingOptions(officeToday(), { pol: b.pol, pod: b.pod });

  const values = {
    id: b.id,
    version: b.version,
    kind: b.kind,
    docType: b.docType,
    payerId: b.payerId,
    shipperId: b.shipperId,
    consigneeId: b.consigneeId,
    notifyId: b.notifyId,
    pol: b.pol,
    pod: b.pod,
    loadAddress: b.loadAddress,
    loadDate: b.loadDate,
    loadTime: b.loadTime,
    commodity: b.commodity,
    carrierBookingNo: b.carrierBookingNo,
    blNo: b.blNo,
    vesselName: b.vesselName,
    voyage: b.voyage,
    etd: b.etd,
    eta: b.eta,
    customsClosing: b.customsClosing,
    vgmClosing: b.vgmClosing,
    siClosing: b.siClosing,
    portCutOff: b.portCutOff,
  };
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Sailing</h2>
        </CardHeader>
        <CardContent>
          <BookingSailing bookingId={b.id} vesselId={b.vesselId} options={sailings} />
        </CardContent>
      </Card>
      <BookingDetailsForm key={b.version} values={values} contacts={contacts} />
    </div>
  );
}
