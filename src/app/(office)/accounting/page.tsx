import type { Metadata } from "next";
import { ModulePending } from "@/components/shared/module-pending";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Accounting" };

export default async function AccountingPage() {
  await requirePagePermission("app.accounting");
  return (
    <ModulePending
      title="Accounting"
      legacy="demo.html lines 12625–14741 (stages 4, 5 and 6a)"
      scope={[
        "Invoices from bookings with gap-free numbering, credit notes, VAT per line, OGM",
        "Supplier bills, payments, CODA / CSV bank import and matching",
        "Journal, P&L, balance sheet, VAT return + Intervat XML, listings",
        "Peppol UBL in/out, assets, reminders, SEPA pain.001, period lock",
        "Import from Odoo (5 CSV files, 499000 check, cut-over)",
      ]}
    />
  );
}
