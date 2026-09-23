import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { periodOf } from "@/domain/period";
import { JournalList } from "@/features/accounting/components/journal-list";
import { PeriodPicker } from "@/features/accounting/components/period-picker";
import { readJournal } from "@/features/accounting/ledger-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: PageProps<"/accounting/journal">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const period = periodOf(await searchParams, today);
  const entries = (await readJournal()).filter((e) => e.date >= period.from && e.date <= period.to);
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
      <Card>
        <CardContent className="pt-2">
          <JournalList entries={entries} period={period} />
        </CardContent>
      </Card>
    </div>
  );
}
