/**
 * Contacts linked to contacts: a person at a company, a location a client ships from or to.
 * The role sits on the link. Before links, these were child addresses under one contact
 * (legacy children[]); `childToContact` turns one of those into a contact of its own.
 */

/** The child-address kinds that were people, not places (legacy "Contact", "Doc Check"). */
export const PERSON_CHILD_KINDS = ["contact", "doc check"] as const;

export type ChildAddress = {
  type: string;
  name: string | null;
  street: string | null;
  zip: string | null;
  /** Its city, a row of its country's list (Settings › Countries). */
  cityId: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
};

export type LinkedContactDraft = {
  type: "person" | "location";
  name: string;
  firstName: string | null;
  lastName: string | null;
  street: string | null;
  zip: string | null;
  /** Its city, a row of its country's list (Settings › Countries). */
  cityId: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  lang: string;
  /** The child's kind, kept as the link's role. */
  role: string;
};

const isPersonKind = (kind: string) =>
  (PERSON_CHILD_KINDS as readonly string[]).includes(kind.trim().toLowerCase());

/** "Jan Peeters" → first "Jan", last "Peeters"; one word is a last name. */
export function splitName(name: string): { firstName: string | null; lastName: string | null } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const lastName = words.pop() ?? null;
  return { firstName: words.join(" ") || null, lastName };
}

/**
 * A child address as a contact of its own: a person when its kind was a person's, else a
 * location. Unnamed, it is named after its kind and its parent ("Delivery address — Acme").
 * A person without its own address takes the parent's country, as the contact form requires one.
 */
export function childToContact(
  a: ChildAddress,
  parent: { name: string; lang: string; country: string | null },
): LinkedContactDraft {
  const person = isPersonKind(a.type);
  const name = a.name?.trim() || `${a.type} — ${parent.name}`;
  const parts = person && a.name?.trim() ? splitName(a.name) : { firstName: null, lastName: null };
  return {
    type: person ? "person" : "location",
    name,
    firstName: parts.firstName,
    lastName: person ? (parts.lastName ?? name) : null,
    street: a.street,
    zip: a.zip,
    cityId: a.cityId,
    country: a.country ?? parent.country,
    phone: a.phone,
    email: a.email,
    note: a.note,
    lang: parent.lang,
    role: a.type,
  };
}
