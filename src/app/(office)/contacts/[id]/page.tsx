import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { may } from "@/domain/permissions";
import { CreditLine } from "@/features/accounting/components/credit-line";
import { creditStanding } from "@/features/accounting/reminder-queries";
import { updateContact } from "@/features/contacts/actions";
import { BankAccounts } from "@/features/contacts/components/bank-accounts";
import { ContactAddresses } from "@/features/contacts/components/contact-addresses";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { toContactFormValues } from "@/features/contacts/form-values";
import { getContact } from "@/features/contacts/queries";
import { ContactAgreements } from "@/features/pricing/components/contact-agreements";
import { listPriceLists } from "@/features/pricing/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readConfig } from "@/server/config-tables";
import { IdChecks } from "@/features/contacts/components/id-checks";
import { readIdFormats } from "@/server/id-config";

export async function generateMetadata({ params }: PageProps<"/contacts/[id]">): Promise<Metadata> {
  const id = z.uuid().safeParse((await params).id);
  const c = id.success ? await getContact(id.data) : null;
  return { title: c?.name ?? "Contact" };
}

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  const user = await requirePagePermission("app.contacts");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [c, addressTypes] = await Promise.all([getContact(id.data), readConfig("addressTypes")]);
  if (!c) notFound();
  const credit = may(user, "app.accounting") ? await creditStanding(c.id) : null;
  const agreements = may(user, "catalogue.edit") ? await listPriceLists({ contactId: c.id }) : null;

  const [professions, tags, idFormats] = await Promise.all([
    readConfig("professions"),
    readConfig("contactTags"),
    readIdFormats(),
  ]);
  return (
    <>
      {credit && <CreditLine {...credit} />}
      <IdChecks
        contactId={c.id}
        checks={[
          { kind: "vat", label: "VAT number", value: c.vat, checkedOn: c.vatCheckedOn },
          { kind: "eori", label: "EORI", value: c.eori, checkedOn: c.eoriCheckedOn },
        ]}
      />
      <ContactForm
        action={updateContact}
        values={toContactFormValues(c)}
        submitLabel="Save"
        professions={professions}
        tags={tags}
        idFormats={idFormats}
      />
      <div className="grid gap-4 pt-4">
        <ContactAddresses contactId={c.id} addresses={c.addresses} types={addressTypes} />
        <BankAccounts contactId={c.id} accounts={c.bankAccounts} />
        {agreements && <ContactAgreements rows={agreements} today={officeToday()} />}
      </div>
    </>
  );
}
