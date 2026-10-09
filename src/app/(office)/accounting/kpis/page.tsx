import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { periodOf } from "@/domain/period";
import { KpiHeadCard, MarginByTable } from "@/features/accounting/components/kpi-tables";
import { PeriodPicker } from "@/features/accounting/components/period-picker";
import { kpis } from "@/features/accounting/kpi-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "KPIs" };

/** The office's figures (legacy KPIs tab): the head, then the margin by customer, destination and line. */
export default async function KpisPage({ searchParams }: PageProps<"/accounting/kpis">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const period = periodOf(await searchParams, today);
  const k = await kpis(period, today);
  return (
    <div className="grid gap-4">
      <PageHeader title="KPIs" description={`${period.from} to ${period.to}`} />
      <PeriodPicker path="/accounting/kpis" period={period} today={today} />
      <KpiHeadCard head={k.head} />
      <MarginByTable title="Margin per customer" rows={k.byCustomer} />
      <MarginByTable title="Margin per destination" rows={k.byDestination} />
      <MarginByTable title="Margin per shipping line" rows={k.byCarrier} />
    </div>
  );
}
