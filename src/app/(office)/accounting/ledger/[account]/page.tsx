import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { accountLedger, accountName } from "@/domain/ledger";
import { formatCents } from "@/domain/money";
import { LATEST, pageOf, periodOf } from "@/domain/period";
import { LedgerTable } from "@/features/accounting/components/ledger-table";
import { Pager } from "@/features/accounting/components/pager";
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
  const sp = await searchParams;
  const period = periodOf(sp, today);
  const l = accountLedger(await readJournal(), account, period.from, period.to);
  const shown = pageOf(l.rows, sp.page ?? LATEST, 200);
  return (
    <div className="grid gap-4">
      <PageHeader
        title={`${account} ${accountName(account)}`}
        description={`Opening ${formatCents(l.openCents)} · closing ${formatCents(l.closeCents)}`}
      />
      <PeriodPicker path={`/accounting/ledger/${account}`} period={period} today={today} />
      <Card>
        <CardContent className="grid gap-3 pt-2">
          <LedgerTable rows={shown.items} />
          <Pager path={`/accounting/ledger/${account}`} params={period} noun="lines" {...shown} />
        </CardContent>
      </Card>
    </div>
  );
}
