import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { contactOptions } from "@/features/contacts/queries";
import { NewQuotationForm } from "@/features/quotations/components/new-quotation-form";
import { newQuotationChoices } from "@/features/quotations/new-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotationPage() {
  await requirePagePermission("app.quotations");
  const [contacts, choices] = await Promise.all([contactOptions(), newQuotationChoices()]);
  // The customer is any contact; a loading address or a stop is a location ("Name — City").
  const places = contacts
    .filter((c) => c.type === "location")
    .map((c) => ({ value: c.id, label: c.city ? `${c.name} — ${c.city}` : c.name }));
  return (
    <>
      <PageHeader title="New quotation" description="The QT number is issued when you save." />
      <NewQuotationForm clients={contacts} places={places} choices={choices} />
    </>
  );
}
