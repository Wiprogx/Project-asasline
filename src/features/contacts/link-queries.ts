import "server-only";
import { aliasedTable, and, asc, eq, isNull, sql } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { liveLookups } from "@/server/lookups";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import {
  contactLinks,
  contacts,
  locationRoles,
  personRoles,
  salutations,
} from "@/server/db/schema";

/** The linked contact as a row of the Persons, Locations or Companies list, and its dialog. */
const otherColumns = (c: typeof contacts) => ({
  id: c.id,
  version: c.version,
  type: c.type,
  name: c.name,
  salutationId: c.salutationId,
  salutation: sql<
    string | null
  >`(select ${salutations.label} from ${salutations} where ${salutations.id} = ${c.salutationId})`,
  firstName: c.firstName,
  lastName: c.lastName,
  jobTitle: c.jobTitle,
  email: c.email,
  phone: c.phone,
  mobile: c.mobile,
  whatsapp: c.whatsapp,
  website: c.website,
  street: c.street,
  zip: c.zip,
  city: c.city,
  country: c.country,
  lang: c.lang,
  siteRef: c.siteRef,
  openingHours: c.openingHours,
  instructions: c.instructions,
  note: c.note,
});

export type LinkedContact = Awaited<ReturnType<typeof linksOf>>[number];

/**
 * Everything linked to a contact, from either end: the persons at a company, the locations it
 * uses, and — seen from a person or a location — the companies it belongs to. Live links to
 * live contacts only; an unlinked or archived one stays in the history.
 */
export async function linksOf(contactId: string) {
  await requirePermission("app.contacts");
  const other = aliasedTable(contacts, "other");
  const link = {
    linkId: contactLinks.id,
    linkVersion: contactLinks.version,
    roleId: sql<string>`coalesce(${contactLinks.personRoleId}, ${contactLinks.locationRoleId})`,
    role: sql<string>`coalesce(${personRoles.label}, ${locationRoles.label})`,
  };
  const live = (end: typeof contactLinks.contactId | typeof contactLinks.linkedId) =>
    and(eq(end, contactId), isNull(contactLinks.archivedAt), isNull(other.archivedAt));
  const [down, up] = await Promise.all([
    db
      .select({ ...link, other: otherColumns(other) })
      .from(contactLinks)
      .innerJoin(other, eq(other.id, contactLinks.linkedId))
      .leftJoin(personRoles, eq(personRoles.id, contactLinks.personRoleId))
      .leftJoin(locationRoles, eq(locationRoles.id, contactLinks.locationRoleId))
      .where(live(contactLinks.contactId)),
    db
      .select({ ...link, other: otherColumns(other) })
      .from(contactLinks)
      .innerJoin(other, eq(other.id, contactLinks.contactId))
      .leftJoin(personRoles, eq(personRoles.id, contactLinks.personRoleId))
      .leftJoin(locationRoles, eq(locationRoles.id, contactLinks.locationRoleId))
      .where(live(contactLinks.linkedId)),
  ]);
  return [...down, ...up].sort((a, b) => a.other.name.localeCompare(b.other.name));
}

/** Live contacts that can be linked: every person, location and company, for the "existing" picker. */
export async function linkCandidates() {
  await requirePermission("app.contacts");
  return cached("contacts:link-candidates", { ttlSeconds: 300, tags: [tags.contacts] }, () =>
    db
      .select({ id: contacts.id, name: contacts.name, type: contacts.type, city: contacts.city })
      .from(contacts)
      .where(isNull(contacts.archivedAt))
      .orderBy(asc(contacts.name)),
  );
}

const asOption = (c: { id: string; name: string; city: string | null }) => ({
  value: c.id,
  label: c.city ? `${c.name} — ${c.city}` : c.name,
});

/**
 * What the Persons / Locations / Companies cards of a contact need: its links, the roles each
 * kind can have (Settings › Lists), and the contacts that can be linked. A company linked from
 * a person carries a person's role there; from a location, a location's.
 */
export async function linkPanel(c: { id: string; type: string }) {
  await requirePermission("app.contacts");
  const [links, all, personRoles, locationRoles] = await Promise.all([
    linksOf(c.id),
    linkCandidates(),
    liveLookups("person-roles"),
    liveLookups("location-roles"),
  ]);
  const ofType = (t: string) => all.filter((x) => x.type === t).map(asOption);
  return {
    links,
    roles: {
      person: personRoles,
      location: locationRoles,
      company: c.type === "location" ? locationRoles : personRoles,
    },
    candidates: {
      person: ofType("person"),
      location: ofType("location"),
      company: ofType("company"),
    },
  };
}
