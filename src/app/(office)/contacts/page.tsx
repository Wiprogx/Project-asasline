import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { SearchInput } from "@/components/shared/search-input";
import { buttonVariants } from "@/components/ui/button";
import { pageOf } from "@/domain/period";
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
  const shown = pageOf(rows, sp.page, 100);

  return (
    <>
      <PageHeader
        title="Contacts"
        description={archived ? "Archived contacts" : `${rows.length} contacts`}
        actions={
          <>
            <Link
              href={archived ? "/contacts" : "/contacts?archived=1"}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {archived ? "Show active" : "Show archived"}
            </Link>
            <Link href="/contacts/new" className={buttonVariants({ size: "sm" })}>
              New contact
            </Link>
          </>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Search name, email, VAT, city, child address…" />
      </div>
      <div className="grid gap-3">
        <ContactsTable rows={shown.items} />
        <Pager
          path="/contacts"
          params={Object.fromEntries(
            Object.entries({ q, archived: archived ? "1" : undefined }).filter(
              (e): e is [string, string] => !!e[1],
            ),
          )}
          noun="contacts"
          {...shown}
        />
      </div>
    </>
  );
}
