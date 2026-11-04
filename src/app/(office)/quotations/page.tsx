import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { buttonVariants } from "@/components/ui/button";
import { parseFigureKeys } from "@/domain/quotation-list";
import { parsePeriodKey, periodScope } from "@/domain/periods";
import { QUOTATION_STATUSES } from "@/domain/shipments";
import { QuotationColumns } from "@/features/quotations/components/quotation-columns";
import { QuotationsFigures } from "@/features/quotations/components/quotations-figures";
import { QuotationsFilters } from "@/features/quotations/components/quotations-filters";
import { QuotationsTable } from "@/features/quotations/components/quotations-table";
import { listQuotations } from "@/features/quotations/queries";
import { QUOTATION_TONE } from "@/features/quotations/status";
import { quotationView } from "@/features/quotations/view-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Quotations" };

const one = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export default async function QuotationsPage({ searchParams }: PageProps<"/quotations">) {
  await requirePagePermission("app.quotations");
  const sp = await searchParams;
  const status = QUOTATION_STATUSES.find((s) => s === sp.status);
  const xstatus = QUOTATION_STATUSES.find((s) => s === sp.xstatus);
  const period = parsePeriodKey(sp.period);
  const cmp = sp.cmp === "prev" && period !== "all";
  const dir = sp.dir === "desc" ? "desc" : undefined;
  const params = {
    q: one(sp.q),
    status,
    period,
    cmp,
    figs: one(sp.figs),
    client: one(sp.client),
    xclient: one(sp.xclient),
    xstatus,
    sort: one(sp.sort),
    dir,
  };
  const today = officeToday();
  const now = periodScope(period, today);
  const scope = {
    q: params.q,
    status,
    client: params.client,
    exclude: { client: params.xclient, status: xstatus },
  };
  const [rows, before, view] = await Promise.all([
    listQuotations({ ...scope, period: now, sort: params.sort, dir }),
    cmp ? listQuotations({ ...scope, period: periodScope(period, today, 1) }) : null,
    quotationView(),
  ]);
  return (
    <>
      {/* The title, its button, the search and the filters stay under the office header while the list scrolls. */}
      <div className="sticky top-12 z-10 -mx-4 -mt-4 mb-4 grid gap-3 border-b bg-background/95 px-4 pt-4 pb-3 backdrop-blur md:-mx-6 md:-mt-6 md:px-6 md:pt-6">
        <PageHeader
          title="Quotations"
          description={status ? QUOTATION_TONE[status][0] : `${rows.length} quotations`}
          actions={
            <Link href="/quotations/new" className={buttonVariants({ size: "sm" })}>
              New quotation
            </Link>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-64 flex-1">
            <SearchInput placeholder="Search QT ref or customer…" />
          </div>
          <QuotationColumns shown={view.columns} />
        </div>
        <QuotationsFilters
          params={params}
          periodLabel={now ? `${now.label} · ${now.from} → ${now.to}` : "All time"}
        />
      </div>
      <QuotationsFigures rows={rows} before={before} shown={parseFigureKeys(params.figs)} />
      <QuotationsTable rows={rows} columns={view.columns} widths={view.widths} />
    </>
  );
}
