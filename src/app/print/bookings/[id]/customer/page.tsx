import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintSheet } from "@/components/shared/print-sheet";
import { bookingCopy } from "@/features/bookings/copy-queries";
import { CustomerCopy } from "@/features/bookings/components/customer-copy";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Customer copy" };

/** The customer copy of the booking, with the price: the browser's print makes the PDF. */
export default async function CustomerCopyPage({
  params,
}: PageProps<"/print/bookings/[id]/customer">) {
  await requirePagePermission("app.bookings");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const copy = await bookingCopy(id.data);
  if (!copy || copy.booking.status === "cancelled") notFound();
  return (
    <PrintSheet kind="Booking confirmation" number={copy.booking.ref}>
      <CustomerCopy copy={copy} />
    </PrintSheet>
  );
}
