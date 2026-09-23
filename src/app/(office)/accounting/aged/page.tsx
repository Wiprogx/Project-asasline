import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AgedTable } from "@/features/accounting/components/aged-table";
import { agedReport } from "@/features/accounting/ledger-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Aged balances" };

export default async function AgedPage() {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const [receivables, payables] = await Promise.all([
    agedReport("receivables", today),
    agedReport("payables", today),
  ]);
  return (
    <div className="grid gap-4">
      <PageHeader title="Aged balances" description={`What is open on ${today}, by days late.`} />
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Customers owe</h2>
        </CardHeader>
        <CardContent>
          <AgedTable rows={receivables} who="Customer" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">We owe suppliers</h2>
        </CardHeader>
        <CardContent>
          <AgedTable rows={payables} who="Supplier" />
        </CardContent>
      </Card>
    </div>
  );
}
