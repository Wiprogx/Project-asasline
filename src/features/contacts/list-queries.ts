import "server-only";
import { and, asc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from "drizzle-orm";
import { PARTY_KEYS } from "@/domain/booking-parties";
import { type ContactFilter, whyMatched } from "@/domain/contact-list";
import { countryName } from "@/domain/countries";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { officeToday } from "@/server/clock";
import { readCountries } from "@/server/countries";
import { professionsOf, tagsOf } from "@/server/contact-labels";
import { db } from "@/server/db/client";
import { bookings, contacts } from "@/server/db/schema";
import { cityNameOf } from "@/server/city-sql";

// The list selects from contacts alone, and in a single-table select Drizzle drops the table
// prefix: ${contacts.id} would read as a bare "id" and bind to the subquery's own table.
const contactId = sql.raw(`"contacts"."id"`);

/**
 * The contacts linked to this one, from either end, with the link's role (legacy children[]),
 * and their words as the search reads them (legacy childHay).
 */
const linkedOf = (id: SQL) => sql`from contact_links l
  join contacts o on o.id = case when l.contact_id = ${id} then l.linked_id else l.contact_id end
  where (l.contact_id = ${id} or l.linked_id = ${id}) and l.archived_at is null and o.archived_at is null`;
const linkRole = sql`coalesce((select label from person_roles r where r.id = l.person_role_id), (select label from location_roles r where r.id = l.location_role_id))`;
const childHay = sql`concat_ws(' ', o.name, ${linkRole}, o.street, o.zip, (select ci.name from cities ci where ci.id = o.city_id), o.country, o.email, o.phone, o.note)`;
const children = sql<
  { name: string | null; type: string; hay: string }[]
>`coalesce((select json_agg(json_build_object('name', o.name, 'type', ${linkRole}, 'hay', ${childHay}))
  ${linkedOf(contactId)}), '[]'::json)`;
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

/** Everything the contact knows, and what is linked to it (legacy contactHay). */
function searchWhere(q: string): SQL {
  const like = `%${q}%`;
  const c = contacts;
  return or(
    ...[c.name, c.email, c.vat, c.eori, c.street, c.zip, c.phone, c.mobile].map((x) =>
      ilike(x, like),
    ),
    ilike(cityNameOf(c.cityId), like),
    ...[c.whatsapp, c.website, c.note].map((x) => ilike(x, like)),
    ilike(sql`array_to_string(${tagsOf()} || ${professionsOf()}, ' ')`, like),
    sql`exists (select 1 ${linkedOf(sql`${c.id}`)} and ${childHay} ilike ${like})`,
  )!;
}

/** One filter of the list (legacy filteredContacts): a value picked, or part of the text. */
function filterWhere({ field, value }: ContactFilter): SQL {
  const c = contacts;
  const like = `%${value}%`;
  if (field === "country") return eq(c.country, value.toUpperCase());
  if (field === "city") return ilike(cityNameOf(c.cityId), value);
  if (field === "type") return eq(c.type, value as "company");
  if (field === "tag") return sql`${value} = any(${tagsOf()})`;
  if (field === "profession") return sql`${value} = any(${professionsOf()})`;
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
      professions: professionsOf(),
      country: c.country,
      city: cityNameOf(c.cityId),
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
      linked: kids.length,
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
        >`coalesce((select array_agg(distinct ci.name order by ci.name) from contacts x join cities ci on ci.id = x.city_id where x.archived_at is null), '{}')`,
        countries: sql<
          string[]
        >`coalesce(array_agg(distinct ${contacts.country} order by ${contacts.country}) filter (where ${contacts.country} is not null), '{}')`,
        tags: sql<
          string[]
        >`coalesce((select array_agg(distinct w.label order by w.label) from contact_tags j join tags w on w.id = j.tag_id join contacts x on x.id = j.contact_id where j.archived_at is null and x.archived_at is null), '{}')`,
        professions: sql<
          string[]
        >`coalesce((select array_agg(distinct w.label order by w.label) from contact_professions j join professions w on w.id = j.profession_id join contacts x on x.id = j.contact_id where j.archived_at is null and x.archived_at is null), '{}')`,
      })
      .from(contacts)
      .where(isNull(contacts.archivedAt));
    return row;
  });
}
