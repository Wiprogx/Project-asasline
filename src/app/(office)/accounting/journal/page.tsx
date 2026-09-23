import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchEntries } from "@/domain/ledger";
import { LATEST, pageOf, periodOf } from "@/domain/period";
import { JournalList } from "@/features/accounting/components/journal-list";
import { Pager } from "@/features/accounting/components/pager";
import { PeriodPicker } from "@/features/accounting/components/period-picker";
import { readJournal } from "@/features/accounting/ledger-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: PageProps<"/accounting/journal">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const sp = await searchParams;
  const period = periodOf(sp, today);
  // A page at a time: a year's journal is thousands of lines, too many to draw at once.
  const shown = pageOf(
    searchEntries(
      (await readJournal()).filter((e) => e.date >= period.from && e.date <= period.to),
      typeof sp.q === "string" ? sp.q : undefined,
    ),
    sp.page ?? LATEST,
    100,
  );
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Journal"
        description="Every entry comes from a numbered document or a payment — nothing is typed in."
        actions={
          <a
            className={buttonVariants({ variant: "outline" })}
            href={`/accounting/journal/export?from=${period.from}&to=${period.to}`}
          >
            Export for the accountant (CSV)
          </a>
        }
      />
      <PeriodPicker path="/accounting/journal" period={period} today={today} />
      <SearchInput placeholder="Search a number, a partner or a label…" />
      <Card>
        <CardContent className="grid gap-3 pt-2">
          <JournalList entries={shown.items} period={period} />
          <Pager path="/accounting/journal" params={period} noun="entries" {...shown} />
        </CardContent>
      </Card>
    </div>
  );
}
