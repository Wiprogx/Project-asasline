import type { Metadata } from "next";
import { InvoicesTable } from "@/features/accounting/components/invoices-table";
import { listInvoices } from "@/features/accounting/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Invoices" };

/** The contact's invoices and credit notes as a customer, and its bills as a supplier. */
export default async function ContactInvoicesPage({
  params,
}: PageProps<"/contacts/[id]/invoices">) {
  await requirePagePermission("app.accounting");
  const { id } = await params;
  const rows = await listInvoices({ contactId: id, kind: "all" });
  return <InvoicesTable rows={rows} today={officeToday()} />;
}
