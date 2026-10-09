import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { QuotationHistory } from "@/features/quotations/components/quotation-history";
import { quotationHistory } from "@/features/quotations/record-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Quotation history" };

export default async function QuotationHistoryPage({
  params,
}: PageProps<"/quotations/[id]/history">) {
  await requirePagePermission("app.quotations");
  const rows = await quotationHistory((await params).id);
  return (
    <Card>
      <CardContent className="pt-4">
        <QuotationHistory rows={rows} />
      </CardContent>
    </Card>
  );
}
