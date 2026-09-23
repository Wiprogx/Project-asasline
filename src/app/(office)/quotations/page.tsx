import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { QuotationsTable } from "@/features/quotations/components/quotations-table";
import { listQuotations } from "@/features/quotations/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage({ searchParams }: PageProps<"/quotations">) {
  await requirePagePermission("app.quotations");
  const sp = await searchParams;
  const rows = await listQuotations({ q: typeof sp.q === "string" ? sp.q : undefined });
  return (
    <>
      <PageHeader
        title="Quotations"
        description={`${rows.length} quotations`}
        actions={
          <Button size="sm" render={<Link href="/quotations/new" />}>
            New quotation
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Search QT ref or customer…" />
      </div>
      <QuotationsTable rows={rows} />
    </>
  );
}
