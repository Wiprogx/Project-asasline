import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { updateContact } from "@/features/contacts/actions";
import { ContactArchive } from "@/features/contacts/components/contact-archive";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { toContactFormValues } from "@/features/contacts/form-values";
import { getContact } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { can } from "@/domain/permissions";
import { CreditLine } from "@/features/accounting/components/credit-line";
import { creditStanding } from "@/features/accounting/reminder-queries";

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  const user = await requirePagePermission("app.contacts");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const c = await getContact(id.data);
  if (!c) notFound();
  const credit = can(user.role, "app.accounting") ? await creditStanding(c.id) : null;

  return (
    <>
      <PageHeader
        title={c.name}
        description={
          c.archivedAt ? (
            <ToneBadge tone="neutral">Archived — {c.archivedReason}</ToneBadge>
          ) : undefined
        }
        actions={<ContactArchive id={c.id} version={c.version} archived={!!c.archivedAt} />}
      />
      {credit && <CreditLine {...credit} />}
      <ContactForm action={updateContact} values={toContactFormValues(c)} submitLabel="Save" />
    </>
  );
}
