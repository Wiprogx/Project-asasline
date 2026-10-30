import { type ContactInput, contactSchema } from "./schemas";

/** The contact's own columns, and its professions and tags: rows of their own (setContactLabels). */
function split({ creditLimit, professions, tags: words, ...rest }: ContactInput) {
  return { row: { ...rest, creditLimitCents: creditLimit }, words: { professions, tags: words } };
}
export const toRow = (c: ContactInput) => split(c).row;
export const wordsOf = (c: ContactInput) => split(c).words;

// The form's fields that are a column of the same name; the language and money are mapped apart.
const COLUMNS = Object.keys(contactSchema.shape).filter(
  (k) => !["professions", "tags", "lang", "creditLimit"].includes(k),
);

/**
 * The columns an edit writes: only the fields the form posted. A section hidden for the type
 * posts nothing, so what it holds (a person's EORI, a location's credit limit, a company's
 * passport number) stays as it is; a field posted empty clears its column.
 */
export function postedRow(c: ContactInput, posted: (field: string) => boolean) {
  const row: Record<string, unknown> = toRow(c);
  // A person's name is built from the names, never posted itself.
  const out: Record<string, unknown> = { name: row.name };
  for (const k of COLUMNS) if (posted(k)) out[k] = row[k] ?? null;
  if (posted("creditLimit")) out.creditLimitCents = row.creditLimitCents;
  // An edit always names a language; it is never emptied.
  if (c.lang) out.lang = c.lang;
  return out;
}
