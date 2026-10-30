import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { NewBookingForm } from "@/features/bookings/components/new-booking-form";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { liveLookups } from "@/server/lookups";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBookingPage() {
  await requirePagePermission("bookings.edit");
  const [clients, containerTypes] = await Promise.all([
    contactOptions(),
    liveLookups("container-types").then((o) => o.map((x) => x.label)),
  ]);
  return (
    <>
      <PageHeader title="New booking" description="The SB number is issued when you save." />
      <NewBookingForm clients={clients} containerTypes={containerTypes} />
    </>
  );
}
