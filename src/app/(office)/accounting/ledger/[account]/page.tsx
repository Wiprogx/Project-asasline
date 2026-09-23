import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { accountLedger, accountName } from "@/domain/ledger";
import { formatCents } from "@/domain/money";
import { periodOf } from "@/domain/period";
import { LedgerTable } from "@/features/accounting/components/ledger-table";
import { PeriodPicker } from "@/features/accounting/components/period-picker";
import { readJournal } from "@/features/accounting/ledger-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Ledger" };

export default async function LedgerPage({
  params,
  searchParams,
}: PageProps<"/accounting/ledger/[account]">) {
  await requirePagePermission("app.accounting");
  const { account } = await params;
  if (!/^\d{6}$/.test(account)) notFound();
  const today = officeToday();
  const period = periodOf(await searchParams, today);
  const l = accountLedger(await readJournal(), account, period.from, period.to);
  return (
    <div className="grid gap-4">
      <PageHeader
        title={`${account} ${accountName(account)}`}
        description={`Opening ${formatCents(l.openCents)} · closing ${formatCents(l.closeCents)}`}
      />
      <PeriodPicker path={`/accounting/ledger/${account}`} period={period} today={today} />
      <Card>
        <CardContent className="pt-2">
          <LedgerTable rows={l.rows} />
        </CardContent>
      </Card>
    </div>
  );
}
