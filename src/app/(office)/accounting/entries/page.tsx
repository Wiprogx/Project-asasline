import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { may } from "@/domain/permissions";
import { EntriesList } from "@/features/accounting/components/entries-list";
import { EntryForm } from "@/features/accounting/components/entry-form";
import { listEntries } from "@/features/accounting/entry-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Journal entries" };

/** The miscellaneous journal's entries written by hand (legacy newEntry / cancelEntry). */
export default async function EntriesPage() {
  const user = await requirePagePermission("app.accounting");
  const canWrite = may(user, "accounting.closePeriods");
  const rows = await listEntries();
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Journal entries"
        description="Adjustments and corrections written by hand; a wrong one is reversed, never edited."
      />
      {canWrite && (
        <Card>
          <CardContent className="pt-4">
            <EntryForm today={officeToday()} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-4">
          <EntriesList rows={rows} canWrite={canWrite} />
        </CardContent>
      </Card>
    </div>
  );
}
