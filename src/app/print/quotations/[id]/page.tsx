import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintSheet } from "@/components/shared/print-sheet";
import { QuotationDocument } from "@/features/quotations/components/quotation-document";
import { getQuotation } from "@/features/quotations/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readQuoteFields } from "@/server/quote-fields-config";

export const metadata: Metadata = { title: "Print quotation" };

/**
 * The printable quotation: letterhead, the customer's document, the footer. Outside the office
 * shell, light on paper; the browser's print makes the PDF.
 */
export default async function PrintQuotationPage({ params }: PageProps<"/print/quotations/[id]">) {
  const user = await requirePagePermission("app.quotations");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [q, fields] = await Promise.all([getQuotation(id.data), readQuoteFields()]);
  if (!q || q.status === "cancelled") notFound();

  return (
    <PrintSheet kind="Quotation" number={q.ref}>
      <QuotationDocument q={q} fields={fields} contact={{ name: user.name, email: user.email }} />
    </PrintSheet>
  );
}
