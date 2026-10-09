import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CostCards } from "@/features/accounting/components/cost-cards";
import { bookingCost } from "@/features/accounting/cost-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Cost & margin" };

/** Expected (from the quotation) vs recorded (the supplier bills) vs the profit (legacy Cost & margin). */
export default async function BookingCostPage({ params }: PageProps<"/bookings/[id]/cost">) {
  await requirePagePermission("costs.view");
  const cost = await bookingCost((await params).id);
  if (!cost) notFound();
  return <CostCards cost={cost} />;
}
