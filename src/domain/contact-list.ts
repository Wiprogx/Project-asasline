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
  { key: "vat", label: "VAT no.", pick: false },
  { key: "email", label: "Email", pick: false },
  { key: "mobile", label: "Mobile", pick: false },
  { key: "note", label: "Note", pick: false },
] as const;
export type FilterField = (typeof FILTER_FIELDS)[number]["key"];
export type ContactFilter = { field: FilterField; value: string };

const PREFIX = "f.";

/** The filters in the URL (`f.city=Antwerpen&f.tag=VIP`), in the order of FILTER_FIELDS. */
export function parseContactFilters(sp: Record<string, string | string[] | undefined>) {
  const out: ContactFilter[] = [];
  for (const f of FILTER_FIELDS) {
    const raw = sp[PREFIX + f.key];
    const v = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (v) out.push({ field: f.key, value: v.slice(0, 100) });
  }
  return out;
}

export const filterParam = (field: FilterField) => PREFIX + field;
export const filterLabel = (field: FilterField) =>
  FILTER_FIELDS.find((f) => f.key === field)?.label ?? field;

/* ---- the columns (legacy C_COLS; city and country read together) ------------------------ */

export const CONTACT_COLUMNS = [
  { key: "professions", label: "Industry" },
  { key: "place", label: "Place" },
  { key: "vat", label: "VAT no." },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "lang", label: "Language" },
  { key: "linked", label: "Linked" },
  { key: "bookings", label: "Bookings" },
  { key: "tasks", label: "Open activities" },
  { key: "note", label: "Note" },
] as const;
export type ContactColumnKey = (typeof CONTACT_COLUMNS)[number]["key"];
export const DEFAULT_CONTACT_COLUMNS: readonly ContactColumnKey[] = [
  "professions",
  "place",
  "vat",
  "email",
];

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
