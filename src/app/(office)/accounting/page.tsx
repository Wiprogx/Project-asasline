import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { NewInvoiceForm } from "@/features/accounting/components/new-invoice-form";
import { InvoicesTable } from "@/features/accounting/components/invoices-table";
import { listInvoices } from "@/features/accounting/queries";
import { listFilterSchema } from "@/features/accounting/schemas";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

const FILTERS = [
  ["", "All"],
  ["status=draft", "Drafts"],
  ["status=issued&kind=invoice", "Issued"],
  ["kind=credit", "Credit notes"],
  ["status=discarded", "Discarded"],
] as const;

export default async function InvoicesPage({ searchParams }: PageProps<"/accounting">) {
  const user = await requirePagePermission("app.accounting");
  const sp = await searchParams;
  const f = listFilterSchema.parse(sp);
  const current = new URLSearchParams(
    Object.entries({ status: f.status, kind: f.kind }).filter(([, v]) => v) as [string, string][],
  ).toString();
  const [rows, customers] = await Promise.all([listInvoices(f), contactOptions()]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Invoices" description={`${rows.length} shown`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Invoice filter" className="flex flex-wrap gap-1">
          {FILTERS.map(([q, label]) => (
            <Link
              key={label}
              href={`/accounting${q ? `?${q}` : ""}`}
              aria-current={current === q ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm",
                current === q
                  ? "bg-accent font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        {can(user.role, "accounting.issue") && <NewInvoiceForm customers={customers} />}
      </div>
      <SearchInput placeholder="Search number, customer or SB ref…" />
      <Card>
        <CardContent className="pt-2">
          <InvoicesTable rows={rows} today={officeToday()} />
        </CardContent>
      </Card>
    </div>
  );
}
