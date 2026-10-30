import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { NewPlaceDialog } from "@/features/contacts/components/new-place-dialog";
import { contactOptions } from "@/features/contacts/queries";
import { NewQuotationForm } from "@/features/quotations/components/new-quotation-form";
import { newQuotationChoices } from "@/features/quotations/new-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readCountries } from "@/server/countries";
import { liveLookups } from "@/server/lookups";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotationPage() {
  await requirePagePermission("app.quotations");
  const [contacts, choices, countries, salutations] = await Promise.all([
    contactOptions(),
    newQuotationChoices(),
    readCountries(),
    liveLookups("salutations"),
  ]);
  const lists = { countries, salutations };
  return (
    <>
      <PageHeader title="New quotation" description="The QT number is issued when you save." />
      <NewQuotationForm
        clients={contacts}
        choices={choices}
        newPlace={<NewPlaceDialog lists={lists} />}
      />
    </>
  );
}
