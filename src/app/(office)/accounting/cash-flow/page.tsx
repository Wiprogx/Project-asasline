import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cashFlow } from "@/domain/cash-flow";
import { periodOf } from "@/domain/period";
import { CashFlowTable } from "@/features/accounting/components/cash-flow-table";
import { PeriodPicker } from "@/features/accounting/components/period-picker";
import { readJournal } from "@/features/accounting/ledger-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readBankAccounts } from "@/server/bank-config";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Cash flow" };

/** What went through the bank, as booked (legacy cash flow): payments registered, by month. */
export default async function CashFlowPage({ searchParams }: PageProps<"/accounting/cash-flow">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const period = periodOf(await searchParams, today);
  const [entries, accounts] = await Promise.all([readJournal(), readBankAccounts()]);
  const bank = [...new Set(["550000", "570000", ...accounts.map((a) => a.account)])];
  const flow = cashFlow(entries, bank, period.from, period.to);
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Cash flow"
        description="What went through the bank, as booked — payments registered, not yet what a statement shows unreconciled."
      />
      <PeriodPicker path="/accounting/cash-flow" period={period} today={today} />
      <Card>
        <CardContent className="pt-2">
          <CashFlowTable flow={flow} />
        </CardContent>
      </Card>
    </div>
  );
}
