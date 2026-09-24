import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lastMonthEnd } from "@/domain/assets";
import { may } from "@/domain/permissions";
import { accrualsScreen } from "@/features/accounting/accrual-queries";
import { AccrualRuns, BookAccruals } from "@/features/accounting/components/accrual-parts";
import { AccrualsTable } from "@/features/accounting/components/accruals-table";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Costs to receive" };

export default async function AccrualsPage({ searchParams }: PageProps<"/accounting/accruals">) {
  const user = await requirePagePermission("app.accounting");
  const today = officeToday();
  const { on } = await searchParams;
  const onDate =
    typeof on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(on) ? on : lastMonthEnd(today);
  const { lines, runs } = await accrualsScreen(onDate);
  const canBook = may(user, "accounting.closePeriods");
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Costs to receive"
        description="Shipments sailed by the day: the cost the quotation expected, less the supplier bills recorded. Booked on 444000 Invoices to receive, reversed the next day."
      />
      <form action="/accounting/accruals" className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="acc-on">Sailed by</Label>
          <Input id="acc-on" name="on" type="date" defaultValue={onDate} />
        </div>
        <Button type="submit" variant="outline">
          Show
        </Button>
      </form>
      <Card>
        <CardContent className="grid gap-3 pt-2">
          <AccrualsTable lines={lines} />
          {canBook && onDate < today && (
            <BookAccruals onDate={onDate} totalCents={lines.reduce((s, l) => s + l.cents, 0)} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Booked</h2>
        </CardHeader>
        <CardContent>
          <AccrualRuns runs={runs} canBook={canBook} />
        </CardContent>
      </Card>
    </div>
  );
}
