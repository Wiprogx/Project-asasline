import "server-only";
import { and, asc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from "drizzle-orm";
import { PARTY_KEYS } from "@/domain/booking-parties";
import { type ContactFilter, whyMatched } from "@/domain/contact-list";
import { countryName } from "@/domain/countries";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { officeToday } from "@/server/clock";
import { readCountries } from "@/server/country-config";
import { db } from "@/server/db/client";
import { bookings, contactAddresses, contacts } from "@/server/db/schema";

// The list selects from contacts alone, and in a single-table select Drizzle drops the table
// prefix: ${contacts.id} would read as a bare "id" and bind to the subquery's own table.
const contactId = sql.raw(`"contacts"."id"`);

/** One address's words, as the search reads them (legacy childHay). */
const childHay = sql`concat_ws(' ', a.name, a.type, a.street, a.zip, a.city, a.country, a.email, a.phone, a.note)`;
const children = sql<
  { name: string | null; type: string; hay: string }[]
>`coalesce((select json_agg(json_build_object('name', a.name, 'type', a.type, 'hay', ${childHay}))
  from contact_addresses a where a.contact_id = ${contactId} and a.archived_at is null), '[]'::json)`;
/** The contact on a booking, in any role (domain/booking-parties). */
const onBooking = sql`${contactId} in (${sql.join(
  PARTY_KEYS.map((k) => bookings[k]),
  sql`, `,
)})`;
const bookingsOf = sql<number>`(select count(*)::int from ${bookings} where ${bookings.status} <> 'cancelled' and ${onBooking})`;
/** Its open activities and those of its bookings, and how many are late (legacy tkCount, tkLate). */
const tasksOf = (
  today: string,
) => sql<string>`(select count(*) || '|' || count(*) filter (where t.due < ${today}::date)
  from activities t where t.state = 'open' and ((t.link_kind = 'contact' and t.link_id = ${contactId})
  or (t.link_kind = 'booking' and t.link_id in (select ${bookings.id} from ${bookings} where ${onBooking}))))`;

export type ContactScope = { q?: string; archived?: boolean; filters?: readonly ContactFilter[] };

/** Everything the contact knows, its addresses too (legacy contactHay). */
function searchWhere(q: string): SQL {
  const like = `%${q}%`;
  const c = contacts;
  return or(
    ...[c.name, c.email, c.vat, c.eori, c.city, c.street, c.zip, c.phone, c.mobile].map((x) =>
      ilike(x, like),
    ),
    ...[c.whatsapp, c.website, c.note].map((x) => ilike(x, like)),
    ilike(sql`array_to_string(${c.tags} || ${c.professions}, ' ')`, like),
    sql`exists (select 1 from ${contactAddresses} a where a.contact_id = ${c.id} and a.archived_at is null and ${childHay} ilike ${like})`,
  )!;
}

/** One filter of the list (legacy filteredContacts): a value picked, or part of the text. */
function filterWhere({ field, value }: ContactFilter): SQL {
  const c = contacts;
  const like = `%${value}%`;
  if (field === "country") return eq(c.country, value.toUpperCase());
  if (field === "city") return ilike(c.city, value);
  if (field === "kind") return eq(c.kind, value as "customer");
  if (field === "tag") return sql`${value} = any(${c.tags})`;
  if (field === "profession") return sql`${value} = any(${c.professions})`;
  if (field === "vat") return ilike(c.vat, like);
  if (field === "email") return ilike(c.email, like);
  if (field === "mobile") return or(ilike(c.mobile, like), ilike(c.phone, like))!;
  return ilike(c.note, like);
}

async function selectRows(s: ContactScope, today: string) {
  const q = s.q?.trim() ?? "";
  const c = contacts;
  const rows = await db
    .select({
      id: c.id,
      name: c.name,
      type: c.type,
      kind: c.kind,
      professions: c.professions,
      country: c.country,
      city: c.city,
      street: c.street,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      vat: c.vat,
      lang: c.lang,
      note: c.note,
      archivedAt: c.archivedAt,
      children,
      bookings: bookingsOf,
      tasks: tasksOf(today),
    })
    .from(c)
    .where(
      and(
        s.archived ? isNotNull(c.archivedAt) : isNull(c.archivedAt),
        q ? searchWhere(q) : undefined,
        ...(s.filters ?? []).map(filterWhere),
      ),
    )
    .orderBy(asc(c.name))
    .limit(500);
  return rows.map(({ archivedAt, children: kids, tasks, ...r }) => {
    const [open, late] = tasks.split("|").map(Number);
    return {
      ...r,
      archived: archivedAt !== null,
      addresses: kids.length,
      openTasks: open,
      lateTasks: late,
      matched: whyMatched([r.name, r.email, r.vat, r.city, r.street, r.note], kids, q),
    };
  });
}

export type ContactRow = Awaited<ReturnType<typeof selectRows>>[number] & {
  /** The country's name from Settings › Countries, the code when unknown. */
  countryName: string | null;
};

/** The contacts list, searched and filtered; Redis-cached for 60 s under the contacts tag. */
export async function listContacts(s: ContactScope = {}): Promise<ContactRow[]> {
  await requirePermission("app.contacts");
  const today = officeToday();
  const key = [
    !!s.archived,
    today,
    ...(s.filters ?? []).map((f) => `${f.field}=${f.value.toLowerCase()}`),
    (s.q ?? "").trim().toLowerCase(),
  ].join(":");
  const [rows, countries] = await Promise.all([
    cached(
      `contacts:list:v2:${key}`,
      { ttlSeconds: 60, tags: [tags.contacts, tags.bookings] },
      () => selectRows(s, today),
    ),
    readCountries(),
  ]);
  return rows.map((r) => ({
    ...r,
    countryName: r.country ? countryName(countries, r.country) : null,
  }));
}

/** The values each pick filter offers (legacy distinctVals): what the contacts actually hold. */
export async function contactFilterValues() {
  await requirePermission("app.contacts");
  return cached("contacts:filter-values", { ttlSeconds: 300, tags: [tags.contacts] }, async () => {
    const [row] = await db
      .select({
        cities: sql<
          string[]
        >`coalesce(array_agg(distinct ${contacts.city} order by ${contacts.city}) filter (where ${contacts.city} is not null), '{}')`,
        countries: sql<
          string[]
        >`coalesce(array_agg(distinct ${contacts.country} order by ${contacts.country}) filter (where ${contacts.country} is not null), '{}')`,
        tags: sql<
          string[]
        >`coalesce((select array_agg(distinct t order by t) from contacts, unnest(contacts.tags) t where contacts.archived_at is null), '{}')`,
        professions: sql<
          string[]
        >`coalesce((select array_agg(distinct p order by p) from contacts, unnest(contacts.professions) p where contacts.archived_at is null), '{}')`,
      })
      .from(contacts)
      .where(isNull(contacts.archivedAt));
    return row;
  });
}
