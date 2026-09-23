import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { createContact } from "@/features/contacts/actions";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage() {
  await requirePagePermission("app.contacts");
  return (
    <>
      <PageHeader title="New contact" />
      <ContactForm action={createContact} submitLabel="Create contact" />
    </>
  );
}
