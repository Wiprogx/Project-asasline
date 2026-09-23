import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { accountLedger, accountName, searchEntries } from "@/domain/ledger";
import { formatCents } from "@/domain/money";
import { LATEST, pageOf, periodOf } from "@/domain/period";
import { LedgerTable } from "@/features/accounting/components/ledger-table";
import { Pager } from "@/components/shared/pager";
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
  // Searched after the running balance is taken, so each line keeps its true balance.
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const found = new Set(
    searchEntries(
      l.rows.map((r) => r.entry),
      q,
    ),
  );
  const shown = pageOf(
    l.rows.filter((r) => found.has(r.entry)),
    sp.page ?? LATEST,
    200,
  );
  return (
    <div className="grid gap-4">
      <PageHeader
        title={`${account} ${accountName(account)}`}
        description={`Opening ${formatCents(l.openCents)} · closing ${formatCents(l.closeCents)}`}
      />
      <PeriodPicker path={`/accounting/ledger/${account}`} period={period} today={today} />
      <SearchInput placeholder="Search a number, a partner or a label…" />
      <Card>
        <CardContent className="grid gap-3 pt-2">
          <LedgerTable rows={shown.items} />
          <Pager path={`/accounting/ledger/${account}`} params={period} noun="lines" {...shown} />
        </CardContent>
      </Card>
    </div>
  );
}
