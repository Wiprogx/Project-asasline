import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { periodOf } from "@/domain/period";
import { MarginTable } from "@/features/accounting/components/margin-table";
import { PeriodPicker } from "@/features/accounting/components/period-picker";
import { profitPerShipment } from "@/features/accounting/ledger-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Margins" };

export default async function MarginsPage({ searchParams }: PageProps<"/accounting/margins">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const period = periodOf(await searchParams, today);
  const rows = await profitPerShipment(period.from, period.to);
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Margins"
        description="Per shipment: its invoices less credit notes, against its supplier bills (net of VAT)."
      />
      <PeriodPicker path="/accounting/margins" period={period} today={today} />
      <Card>
        <CardContent className="pt-2">
          <MarginTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
