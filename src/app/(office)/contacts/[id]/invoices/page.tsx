import type { Metadata } from "next";
import { InvoicesTable } from "@/features/accounting/components/invoices-table";
import { PartnerMoney } from "@/features/accounting/components/partner-money";
import { contactMoney } from "@/features/accounting/partner-queries";
import { listInvoices } from "@/features/accounting/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Invoices" };

/** The contact's balance and payments, its invoices and credit notes, and its bills as a supplier. */
export default async function ContactInvoicesPage({
  params,
}: PageProps<"/contacts/[id]/invoices">) {
  await requirePagePermission("app.accounting");
  const { id } = await params;
  const today = officeToday();
  const [rows, money] = await Promise.all([
    listInvoices({ contactId: id, kind: "all" }),
    contactMoney(id, today),
  ]);
  return (
    <div className="grid gap-4">
      {money && <PartnerMoney balance={money.balance} payments={money.payments} />}
      <InvoicesTable rows={rows} today={today} />
    </div>
  );
}
