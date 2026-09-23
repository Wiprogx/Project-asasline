import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPANY } from "@/domain/company";
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
    <main className="mx-auto grid max-w-3xl gap-8 bg-white p-10 text-neutral-900">
      <header className="flex items-start justify-between gap-4 border-b-2 border-[#c9a961] pb-4">
        <div>
          <div className="text-2xl font-bold tracking-wide text-[#0a2540]">{COMPANY.name}</div>
          <div className="text-xs tracking-widest text-[#c9a961] uppercase">{COMPANY.tag}</div>
          <div className="mt-1 text-xs">{COMPANY.address}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold">
            {i.kind === "credit" ? "Credit note" : "Invoice"}
          </div>
          <div className="font-mono">{i.number}</div>
        </div>
      </header>
      <InvoiceView inv={inv} />
      <footer className="border-t pt-3 text-center text-[11px] leading-5 text-neutral-600">
        Tel {COMPANY.tel} · {COMPANY.email} · {COMPANY.web} · VAT {COMPANY.vat}
        <br />
        {COMPANY.bank} · IBAN {COMPANY.iban} · BIC {COMPANY.bic}
      </footer>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.addEventListener('load',()=>setTimeout(()=>window.print(),300))",
        }}
      />
    </main>
  );
}
