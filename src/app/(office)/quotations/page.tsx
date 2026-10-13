import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { buttonVariants } from "@/components/ui/button";
import { parseFigureKeys } from "@/domain/quotation-list";
import { parsePeriodKey, periodScope } from "@/domain/periods";
import { QUOTATION_STATUSES } from "@/domain/shipments";
import { QuotationsFigures } from "@/features/quotations/components/quotations-figures";
import { QuotationsTable } from "@/features/quotations/components/quotations-table";
import { topLanes } from "@/features/quotations/figure-queries";
import { listQuotations } from "@/features/quotations/queries";
import { QUOTATION_TONE } from "@/features/quotations/status";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage({ searchParams }: PageProps<"/quotations">) {
  await requirePagePermission("app.quotations");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = QUOTATION_STATUSES.find((s) => s === sp.status);
  const period = parsePeriodKey(sp.period);
  const cmp = sp.cmp === "prev" && period !== "all";
  const figs = typeof sp.figs === "string" ? sp.figs : undefined;
  const today = officeToday();
  const now = periodScope(period, today);
  const scope = { q, status, period: now };
  const [rows, before, lanes] = await Promise.all([
    listQuotations(scope),
    cmp ? listQuotations({ q, status, period: periodScope(period, today, 1) }) : null,
    topLanes(scope),
  ]);
  return (
    <>
      <PageHeader
        title="Quotations"
        description={status ? QUOTATION_TONE[status][0] : `${rows.length} quotations`}
        actions={
          <Link href="/quotations/new" className={buttonVariants({ size: "sm" })}>
            New quotation
          </Link>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Search QT ref or customer…" />
      </div>
      <QuotationsFigures
        rows={rows}
        before={before}
        shown={parseFigureKeys(figs)}
        params={{ q, status, period, cmp, figs }}
        periodLabel={now ? `${now.label} · ${now.from} → ${now.to}` : "All time"}
        lanes={lanes}
      />
      <QuotationsTable rows={rows} />
    </>
  );
}
