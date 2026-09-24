import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintSheet } from "@/components/shared/print-sheet";
import { bookingCopy } from "@/features/bookings/copy-queries";
import { TruckerCopy } from "@/features/bookings/components/trucker-copy";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Trucker copy" };

/** The trucker copy: no price, one box (?box=1…) or all of them on one sheet. */
export default async function TruckerCopyPage({
  params,
  searchParams,
}: PageProps<"/print/bookings/[id]/trucker">) {
  await requirePagePermission("app.bookings");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const copy = await bookingCopy(id.data);
  if (!copy || copy.booking.status === "cancelled") notFound();
  const { box } = await searchParams;
  const n = z.coerce.number().int().positive().safeParse(box);
  return (
    <PrintSheet kind="Loading order" number={copy.booking.ref}>
      <TruckerCopy copy={copy} box={n.success ? n.data - 1 : null} />
    </PrintSheet>
  );
}
