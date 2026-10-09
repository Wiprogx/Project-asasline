import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { buttonVariants } from "@/components/ui/button";
import { QuotationsTable } from "@/features/quotations/components/quotations-table";
import { listQuotations } from "@/features/quotations/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { QUOTATION_STATUSES } from "@/domain/shipments";
import { QuotationsFigures } from "@/features/quotations/components/quotations-figures";
import { QUOTATION_TONE } from "@/features/quotations/status";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage({ searchParams }: PageProps<"/quotations">) {
  await requirePagePermission("app.quotations");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = QUOTATION_STATUSES.find((s) => s === sp.status);
  const rows = await listQuotations({ q, status });
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
      <QuotationsFigures rows={rows} q={q} status={status} />
      <QuotationsTable rows={rows} />
    </>
  );
}
