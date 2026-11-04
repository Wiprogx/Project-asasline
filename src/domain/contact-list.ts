import type { TableViewSpec } from "./table-prefs";

/**
 * The contacts list as the office reads it (legacy vContacts, C_COLS, FILTER_FIELDS,
 * filteredContacts): who is a customer or a supplier, the filters added one by one, the
 * columns chosen, and which address answered a search.
 */
export const CONTACT_KINDS = ["customer", "supplier", "both"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/* ---- the filters (legacy FILTER_FIELDS): a value picked, or part of the text ------------ */

export const FILTER_FIELDS = [
  { key: "type", label: "Type", pick: true },
  { key: "city", label: "City", pick: true },
  { key: "country", label: "Country", pick: true },
  { key: "profession", label: "Industry", pick: true },
  { key: "tag", label: "Tag", pick: true },
  { key: "lang", label: "Language", pick: true },
  { key: "vat", label: "VAT no.", pick: false },
  { key: "email", label: "Email", pick: false },
  { key: "mobile", label: "Mobile", pick: false },
  { key: "note", label: "Note", pick: false },
] as const;
export type FilterField = (typeof FILTER_FIELDS)[number]["key"];
export type ContactFilter = { field: FilterField; value: string };

const PREFIX = "f.";
const EXCLUDE = "x.";

/** The filters in the URL (`f.city=Antwerpen&f.tag=VIP`), in the order of FILTER_FIELDS. */
export function parseContactFilters(
  sp: Record<string, string | string[] | undefined>,
  prefix: string = PREFIX,
) {
  const out: ContactFilter[] = [];
  for (const f of FILTER_FIELDS) {
    const raw = sp[prefix + f.key];
    const v = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (v) out.push({ field: f.key, value: v.slice(0, 100) });
  }
  return out;
}

export const filterParam = (field: FilterField) => PREFIX + field;
/** The filters a list leaves out ("Filter out" on a row): `x.city=Antwerpen`. */
export const excludeParam = (field: FilterField) => EXCLUDE + field;
export const parseContactExclusions = (sp: Record<string, string | string[] | undefined>) =>
  parseContactFilters(sp, EXCLUDE);
export const filterLabel = (field: FilterField) =>
  FILTER_FIELDS.find((f) => f.key === field)?.label ?? field;

/* ---- the columns (legacy C_COLS; city and country read together) ------------------------ */

export const CONTACT_COLUMNS = [
  { key: "professions", label: "Industry", width: 160 },
  { key: "place", label: "Place", width: 180 },
  { key: "vat", label: "VAT no.", width: 140 },
  { key: "email", label: "Email", width: 220 },
  { key: "mobile", label: "Mobile", width: 150 },
  { key: "lang", label: "Language", width: 90 },
  { key: "linked", label: "Linked", width: 90 },
  { key: "bookings", label: "Bookings", width: 100 },
  { key: "tasks", label: "Open activities", width: 160 },
  { key: "note", label: "Note", width: 240 },
] as const;
/** The name column is always shown; it is sized like the others. */
export const CONTACT_NAME_COLUMN = { key: "name", label: "Name", width: 260 } as const;
export type ContactColumnKey = (typeof CONTACT_COLUMNS)[number]["key"];
export const DEFAULT_CONTACT_COLUMNS: readonly ContactColumnKey[] = [
  "professions",
  "place",
  "vat",
  "email",
];
/** Where a person's columns and widths are kept, and what they may size. */
export const CONTACT_VIEW: TableViewSpec<ContactColumnKey> = {
  key: "contacts.list",
  all: CONTACT_COLUMNS,
  defaults: DEFAULT_CONTACT_COLUMNS,
  sizable: [CONTACT_NAME_COLUMN.key, ...CONTACT_COLUMNS.map((c) => c.key)],
};

/** The linked contacts that answered the search, when its own fields did not (legacy whyMatched). */
export function whyMatched(
  own: readonly (string | null)[],
  children: readonly { name: string | null; type: string; hay: string }[],
  q: string,
): string[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  if (own.some((v) => v?.toLowerCase().includes(s))) return [];
  return children
    .filter((c) => c.hay.toLowerCase().includes(s))
    .map((c) => `${c.name || "—"} (${c.type})`);
}
