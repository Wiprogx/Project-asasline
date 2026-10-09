import type { Metadata } from "next";
import { QuoteFieldsForm } from "@/features/settings-tables/components/quote-fields-form";
import { quoteFieldsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Quotation document" };

/** What the printed quotation shows (legacy QUOTE_FIELDS). */
export default async function QuotationDocumentSettingsPage() {
  await requirePagePermission("app.settings");
  const { fields, version } = await quoteFieldsForEdit();
  return <QuoteFieldsForm fields={fields} version={version} />;
}
