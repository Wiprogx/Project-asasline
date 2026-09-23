import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { contactOptions } from "@/features/contacts/queries";
import { NewQuotationForm } from "@/features/quotations/components/new-quotation-form";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotationPage() {
  await requirePagePermission("app.quotations");
  const [clients, containerTypes] = await Promise.all([
    contactOptions(),
    readConfig("containerTypes"),
  ]);
  return (
    <>
      <PageHeader title="New quotation" description="The QT number is issued when you save." />
      <NewQuotationForm clients={clients} containerTypes={containerTypes} />
    </>
  );
}
