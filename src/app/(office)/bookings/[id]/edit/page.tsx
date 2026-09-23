import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BookingDetailsForm } from "@/features/bookings/components/booking-details-form";
import { getBooking } from "@/features/bookings/queries";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Edit booking" };

export default async function EditBookingPage({ params }: PageProps<"/bookings/[id]/edit">) {
  await requirePagePermission("bookings.edit");
  const { id } = await params;
  const [b, contacts] = await Promise.all([getBooking(id), contactOptions()]);
  if (!b) notFound();
  if (b.status === "cancelled") redirect(`/bookings/${id}`);

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
  return <BookingDetailsForm values={values} contacts={contacts} />;
}
