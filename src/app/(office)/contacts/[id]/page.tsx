import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { can } from "@/domain/permissions";
import { CreditLine } from "@/features/accounting/components/credit-line";
import { creditStanding } from "@/features/accounting/reminder-queries";
import { updateContact } from "@/features/contacts/actions";
import { BankAccounts } from "@/features/contacts/components/bank-accounts";
import { ContactAddresses } from "@/features/contacts/components/contact-addresses";
import { ContactArchive } from "@/features/contacts/components/contact-archive";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { ContactReach } from "@/features/contacts/components/contact-reach";
import { toContactFormValues } from "@/features/contacts/form-values";
import { getContact } from "@/features/contacts/queries";
import { ContactAgreements } from "@/features/pricing/components/contact-agreements";
import { listPriceLists } from "@/features/pricing/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readConfig } from "@/server/config-tables";

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  const user = await requirePagePermission("app.contacts");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [c, addressTypes] = await Promise.all([getContact(id.data), readConfig("addressTypes")]);
  if (!c) notFound();
  const credit = can(user.role, "app.accounting") ? await creditStanding(c.id) : null;
  const agreements = can(user.role, "catalogue.edit")
    ? await listPriceLists({ contactId: c.id })
    : null;

  return (
    <>
      <PageHeader
        title={c.name}
        description={
          c.archivedAt ? (
            <ToneBadge tone="neutral">Archived — {c.archivedReason}</ToneBadge>
          ) : undefined
        }
        actions={
          <>
            <ContactReach phone={c.phone} mobile={c.mobile} whatsapp={c.whatsapp} email={c.email} />
            <ContactArchive id={c.id} version={c.version} archived={!!c.archivedAt} />
          </>
        }
      />
      {credit && <CreditLine {...credit} />}
      <ContactForm action={updateContact} values={toContactFormValues(c)} submitLabel="Save" />
      <div className="grid gap-4 pt-4">
        <ContactAddresses contactId={c.id} addresses={c.addresses} types={addressTypes} />
        <BankAccounts contactId={c.id} accounts={c.bankAccounts} />
        {agreements && <ContactAgreements rows={agreements} today={officeToday()} />}
      </div>
    </>
  );
}
