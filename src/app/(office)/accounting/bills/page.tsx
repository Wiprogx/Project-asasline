import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { NewBillForm } from "@/features/accounting/components/bill-controls";
import { InvoicesTable } from "@/features/accounting/components/invoices-table";
import { listInvoices } from "@/features/accounting/queries";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Supplier bills" };

export default async function BillsPage({ searchParams }: PageProps<"/accounting/bills">) {
  const user = await requirePagePermission("app.accounting");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const [rows, suppliers] = await Promise.all([
    listInvoices({ kind: "bill", q }),
    contactOptions(),
  ]);
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Supplier bills"
        description="What we owe: shipment costs and the office's own. From €5,000 a second person approves before payment."
        actions={can(user.role, "accounting.issue") && <NewBillForm suppliers={suppliers} />}
      />
      <SearchInput placeholder="Search our number, supplier or SB ref…" />
      <Card>
        <CardContent className="pt-2">
          <InvoicesTable rows={rows} today={officeToday()} />
        </CardContent>
      </Card>
    </div>
  );
}
