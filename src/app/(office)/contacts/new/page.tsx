import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { createContact } from "@/features/contacts/actions";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";
import { readIdFormats } from "@/server/id-config";
import { readCountries } from "@/server/country-config";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage() {
  await requirePagePermission("app.contacts");
  const [professions, tags, idFormats, countries] = await Promise.all([
    readConfig("professions"),
    readConfig("contactTags"),
    readIdFormats(),
    readCountries(),
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
      />
    </>
  );
}
