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

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  await requirePagePermission("app.contacts");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const c = await getContact(id.data);
  if (!c) notFound();

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
      <ContactForm action={updateContact} values={toContactFormValues(c)} submitLabel="Save" />
    </>
  );
}
