/**
 * The legacy office's settings as they come out of its `records` table (kind "config", id the
 * table's name, body `{ value }`; legacy STORE_CONFIG), read into the new Settings: each word
 * list into its own table (scripts/import/lookups), the rate catalogue into `rate_items`.
 */

/** A config record's value: `{ value: … }` as the store saved it, or the value itself. */
export function configValueOf(body: Record<string, unknown> | unknown[]): unknown {
  return !Array.isArray(body) && "value" in body ? body.value : body;
}

/** "40F HC" → "40HC", "20F DV" → "20DV" (the new container types); anything else unchanged. */
export function boxType(v: string): string {
  const m = /^\s*(\d{2})\s*F?\s*([A-Z]{2})\s*$/i.exec(v);
  return m ? `${m[1]}${m[2].toUpperCase()}` : v.trim();
}

/** A word list, cleaned: strings only, trimmed, once each; null when it is not a list of words. */
export function listOf(value: unknown, name?: string): string[] | null {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) return null;
  const words = (value as string[])
    .map((v) => (name === "CONTAINER_TYPES" ? boxType(v) : v.trim()))
    .filter(Boolean);
  const once = [...new Set(words)];
  return once.length ? once : null;
}

/** "Antwerp (BEANR)" → "BEANR"; a bare UN/LOCODE stays; anything else is kept as typed. */
export function portCode(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const inBrackets = /\(([A-Z]{2}[A-Z0-9]{3})\)\s*$/.exec(v);
  if (inBrackets) return inBrackets[1];
  return v.trim().toUpperCase();
}
