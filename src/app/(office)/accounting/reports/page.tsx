import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { balanceSheet, profitAndLoss, trialBalance } from "@/domain/ledger";
import { periodOf } from "@/domain/period";
import { PeriodPicker } from "@/features/accounting/components/period-picker";
import {
  BalanceSheetTable,
  ProfitLossTable,
  TrialBalanceTable,
} from "@/features/accounting/components/report-tables";
import { readJournal } from "@/features/accounting/ledger-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/accounting/reports">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const period = periodOf(await searchParams, today);
  const tb = trialBalance(await readJournal(), period.from, period.to);
  return (
    <div className="grid gap-4">
      <PageHeader title="Reports" description={`${period.from} to ${period.to}`} />
      <PeriodPicker path="/accounting/reports" period={period} today={today} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfitLossTable pl={profitAndLoss(tb)} period={period} />
        <BalanceSheetTable bs={balanceSheet(tb)} period={period} />
      </div>
      <TrialBalanceTable rows={tb} period={period} />
    </div>
  );
}
