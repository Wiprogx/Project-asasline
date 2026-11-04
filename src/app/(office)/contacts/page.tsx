import type { Metadata } from "next";
import { Pager } from "@/components/shared/pager";
import { SearchInput } from "@/components/shared/search-input";
import {
  excludeParam,
  filterParam,
  parseContactExclusions,
  parseContactFilters,
} from "@/domain/contact-list";
import { countryName } from "@/domain/countries";
import { pageOf } from "@/domain/period";
import { ContactCards } from "@/features/contacts/components/contact-cards";
import { ContactColumns } from "@/features/contacts/components/contact-columns";
import { ContactFilters } from "@/features/contacts/components/contact-filters";
import { ContactsHeader } from "@/features/contacts/components/contacts-header";
import { ContactsTable } from "@/features/contacts/components/contacts-table";
import { ViewSwitch } from "@/features/contacts/components/view-switch";
import { contactFilterValues, listContacts } from "@/features/contacts/list-queries";
import { contactView } from "@/features/contacts/view-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readCountries } from "@/server/countries";

export const metadata: Metadata = { title: "Contacts" };

const one = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  await requirePagePermission("app.contacts");
  const sp = await searchParams;
  const q = one(sp.q);
  const archived = sp.archived === "1";
  const cards = sp.view === "cards";
  const filters = parseContactFilters(sp);
  const excluded = parseContactExclusions(sp);
  const sort = one(sp.sort);
  const dir = sp.dir === "desc" ? "desc" : undefined;
  const [rows, values, countries, view] = await Promise.all([
    listContacts({ q, archived, filters, excluded, sort, dir }),
    contactFilterValues(),
    readCountries(),
    contactView(),
  ]);
  const shown = pageOf(rows, sp.page, 100);
  const keep = {
    q,
    archived: archived ? "1" : undefined,
    view: one(sp.view),
    sort,
    dir,
    ...Object.fromEntries(filters.map((f) => [filterParam(f.field), f.value])),
    ...Object.fromEntries(excluded.map((f) => [excludeParam(f.field), f.value])),
  };
  return (
    <>
      {/* The title, its buttons, the search and the filters stay under the office header while the list scrolls. */}
      <div className="sticky top-12 z-10 -mx-4 -mt-4 mb-4 grid gap-3 border-b bg-background/95 px-4 pt-4 pb-3 backdrop-blur md:-mx-6 md:-mt-6 md:px-6 md:pt-6">
        <ContactsHeader count={rows.length} archived={archived} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-64 flex-1">
            <SearchInput placeholder="Name, address, consignee, city, VAT…" />
          </div>
          {!cards && <ContactColumns shown={view.columns} />}
          <ViewSwitch cards={cards} />
        </div>
        <ContactFilters
          active={filters}
          excluded={excluded}
          values={values}
          countryName={Object.fromEntries(
            values.countries.map((c) => [c, countryName(countries, c)]),
          )}
        />
      </div>
      <div className="grid gap-3">
        {cards ? (
          <ContactCards rows={shown.items} />
        ) : (
          <ContactsTable rows={shown.items} columns={view.columns} widths={view.widths} />
        )}
        <Pager
          path="/contacts"
          params={Object.fromEntries(
            Object.entries(keep).filter((e): e is [string, string] => !!e[1]),
          )}
          noun="contacts"
          {...shown}
        />
      </div>
    </>
  );
}
