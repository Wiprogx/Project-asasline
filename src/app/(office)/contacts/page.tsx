import type { Metadata } from "next";
import { Pager } from "@/components/shared/pager";
import { SearchInput } from "@/components/shared/search-input";
import { UrlPicks } from "@/components/shared/url-picks";
import { parsePicks } from "@/domain/picks";
import {
  CONTACT_COLUMNS,
  DEFAULT_CONTACT_COLUMNS,
  filterParam,
  parseContactFilters,
} from "@/domain/contact-list";
import { countryName } from "@/domain/countries";
import { pageOf } from "@/domain/period";
import { ContactCards } from "@/features/contacts/components/contact-cards";
import { ContactFilters } from "@/features/contacts/components/contact-filters";
import { ContactsHeader } from "@/features/contacts/components/contacts-header";
import { ContactsTable } from "@/features/contacts/components/contacts-table";
import { ViewSwitch } from "@/features/contacts/components/view-switch";
import { contactFilterValues, listContacts } from "@/features/contacts/list-queries";
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
  const [rows, values, countries] = await Promise.all([
    listContacts({ q, archived, filters }),
    contactFilterValues(),
    readCountries(),
  ]);
  const shown = pageOf(rows, sp.page, 100);
  const columns = parsePicks(CONTACT_COLUMNS, DEFAULT_CONTACT_COLUMNS, sp.cols);
  const keep = {
    q,
    archived: archived ? "1" : undefined,
    view: one(sp.view),
    cols: one(sp.cols),
    ...Object.fromEntries(filters.map((f) => [filterParam(f.field), f.value])),
  };
  return (
    <>
      <ContactsHeader count={rows.length} archived={archived} />
      <div className="mb-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-64 flex-1">
            <SearchInput placeholder="Name, address, consignee, city, VAT…" />
          </div>
          <ViewSwitch cards={cards} />
        </div>
        <ContactFilters
          active={filters}
          values={values}
          countryName={Object.fromEntries(
            values.countries.map((c) => [c, countryName(countries, c)]),
          )}
        />
        {!cards && (
          <UrlPicks
            param="cols"
            title="Choose the columns"
            defs={CONTACT_COLUMNS}
            defaults={DEFAULT_CONTACT_COLUMNS}
            shown={columns}
          />
        )}
      </div>
      <div className="grid gap-3">
        {cards ? (
          <ContactCards rows={shown.items} />
        ) : (
          <ContactsTable rows={shown.items} columns={columns} />
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
