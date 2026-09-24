import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintSheet } from "@/components/shared/print-sheet";
import { InvoiceView } from "@/features/accounting/components/invoice-view";
import { getInvoice } from "@/features/accounting/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Print invoice" };

/**
 * The printable invoice: letterhead, the same InvoiceView as the screen, and the footer the
 * law asks for. Outside the office shell, light on paper; the browser's print makes the PDF.
 */
export default async function PrintInvoicePage({ params }: PageProps<"/print/invoices/[id]">) {
  await requirePagePermission("app.accounting");
  const inv = await getInvoice((await params).id);
  if (!inv || inv.invoice.status !== "issued") notFound();
  const i = inv.invoice;

  return (
    <PrintSheet kind={i.kind === "credit" ? "Credit note" : "Invoice"} number={i.number ?? ""} bank>
      <InvoiceView inv={inv} />
    </PrintSheet>
  );
}
