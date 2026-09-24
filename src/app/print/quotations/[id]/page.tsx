import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { COMPANY } from "@/domain/company";
import { QuotationDocument } from "@/features/quotations/components/quotation-document";
import { getQuotation } from "@/features/quotations/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Print quotation" };

/**
 * The printable quotation: letterhead, the customer's document, the footer. Outside the office
 * shell, light on paper; the browser's print makes the PDF.
 */
export default async function PrintQuotationPage({ params }: PageProps<"/print/quotations/[id]">) {
  await requirePagePermission("app.quotations");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const q = await getQuotation(id.data);
  if (!q || q.status === "cancelled") notFound();

  return (
    <main className="mx-auto grid max-w-3xl gap-8 bg-white p-10 text-neutral-900">
      <header className="flex items-start justify-between gap-4 border-b-2 border-[#c9a961] pb-4">
        <div>
          <div className="text-2xl font-bold tracking-wide text-[#0a2540]">{COMPANY.name}</div>
          <div className="text-xs tracking-widest text-[#c9a961] uppercase">{COMPANY.tag}</div>
          <div className="mt-1 text-xs">{COMPANY.address}</div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-semibold">Quotation</h1>
          <div className="font-mono">{q.ref}</div>
        </div>
      </header>
      <QuotationDocument q={q} />
      <footer className="border-t pt-3 text-center text-[11px] leading-5 text-neutral-600">
        Tel {COMPANY.tel} · {COMPANY.email} · {COMPANY.web} · VAT {COMPANY.vat}
      </footer>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.addEventListener('load',()=>setTimeout(()=>window.print(),300))",
        }}
      />
    </main>
  );
}
