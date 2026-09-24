import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { may } from "@/domain/permissions";
import { RemindersTable } from "@/features/accounting/components/reminders-table";
import { remindersDue } from "@/features/accounting/reminder-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const user = await requirePagePermission("app.accounting");
  const today = officeToday();
  const rows = await remindersDue(today, user.name);
  const due = rows.filter((r) => r.step).length;
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Reminders"
        description={`${rows.length} overdue · ${due} reminder${due === 1 ? "" : "s"} due today. Friendly after 1 day, second after 15, last notice after 30 — never twice within 10 days.`}
      />
      <Card>
        <CardContent className="pt-2">
          <RemindersTable rows={rows} today={today} canWrite={may(user, "accounting.issue")} />
        </CardContent>
      </Card>
    </div>
  );
}
