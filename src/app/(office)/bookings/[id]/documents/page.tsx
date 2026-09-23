import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentChain } from "@/features/bookings/components/document-chain";
import { documentChain } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Documents" };

export default async function BookingDocumentsPage({
  params,
}: PageProps<"/bookings/[id]/documents">) {
  await requirePagePermission("app.bookings");
  const steps = await documentChain((await params).id);
  if (!steps) notFound();
  return (
    <Card>
      <CardContent className="pt-4">
        <DocumentChain steps={steps} today={officeToday()} />
      </CardContent>
    </Card>
  );
}
