import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { ContactsTable } from "@/features/contacts/components/contacts-table";
import { listContacts } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  await requirePagePermission("app.contacts");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const archived = sp.archived === "1";
  const rows = await listContacts({ q, archived });

  return (
    <>
      <PageHeader
        title="Contacts"
        description={archived ? "Archived contacts" : `${rows.length} contacts`}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={archived ? "/contacts" : "/contacts?archived=1"} />}
            >
              {archived ? "Show active" : "Show archived"}
            </Button>
            <Button size="sm" render={<Link href="/contacts/new" />}>
              New contact
            </Button>
          </>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Search name, email, VAT, city, child address…" />
      </div>
      <ContactsTable rows={rows} />
    </>
  );
}
