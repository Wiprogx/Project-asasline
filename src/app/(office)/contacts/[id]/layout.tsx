import { notFound } from "next/navigation";
import { z } from "zod";
import { SubNav } from "@/components/layout/sub-nav";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { may } from "@/domain/permissions";
import { ContactArchive } from "@/features/contacts/components/contact-archive";
import { ContactReach } from "@/features/contacts/components/contact-reach";
import { getContact } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";

/** The contact's header and tabs (legacy contact tabs); each tab is its own URL. */
export default async function ContactLayout({ params, children }: LayoutProps<"/contacts/[id]">) {
  const user = await requirePagePermission("app.contacts");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const c = await getContact(id.data);
  if (!c) notFound();
  const base = `/contacts/${c.id}`;
  const tabs = [
    { href: base, label: "Details", exact: true },
    ...(may(user, "app.bookings") ? [{ href: `${base}/bookings`, label: "Bookings" }] : []),
    ...(may(user, "app.bookings") ? [{ href: `${base}/documents`, label: "Documents" }] : []),
    ...(may(user, "app.quotations") ? [{ href: `${base}/quotations`, label: "Quotations" }] : []),
    ...(may(user, "app.accounting") ? [{ href: `${base}/invoices`, label: "Invoices" }] : []),
    ...(may(user, "app.discuss") ? [{ href: `${base}/messages`, label: "Messages" }] : []),
    ...(may(user, "app.activity") ? [{ href: `${base}/tasks`, label: "Tasks" }] : []),
  ];
  return (
    <>
      <PageHeader
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {c.archivedAt && <ToneBadge tone="neutral">Archived — {c.archivedReason}</ToneBadge>}
            {c.tags.map((t) => (
              <ToneBadge key={t} tone="info">
                {t}
              </ToneBadge>
            ))}
          </span>
        }
        actions={
          <>
            <ContactReach phone={c.phone} mobile={c.mobile} whatsapp={c.whatsapp} email={c.email} />
            <ContactArchive id={c.id} version={c.version} archived={!!c.archivedAt} />
          </>
        }
      />
      <SubNav items={tabs} />
      {children}
    </>
  );
}
