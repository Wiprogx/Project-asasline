import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { createContact } from "@/features/contacts/actions";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { requirePagePermission } from "@/server/auth/dal";
import { liveLookups } from "@/server/lookups";
import { readIdFormats } from "@/server/id-config";
import { readPaymentTerms } from "@/server/accounting-config";
import { readCountries } from "@/server/country-config";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage() {
  await requirePagePermission("app.contacts");
  const [professions, tags, idFormats, countries, terms, salutations] = await Promise.all([
    liveLookups("professions").then((o) => o.map((x) => x.label)),
    liveLookups("contact-tags").then((o) => o.map((x) => x.label)),
    readIdFormats(),
    readCountries(),
    readPaymentTerms(),
    liveLookups("salutations"),
  ]);
  return (
    <>
      <PageHeader title="New contact" />
      <ContactForm
        action={createContact}
        submitLabel="Create contact"
        professions={professions}
        tags={tags}
        idFormats={idFormats}
        countries={countries}
        terms={terms.map((t) => ({ value: t.id, label: t.name }))}
        salutations={salutations}
      />
    </>
  );
}
