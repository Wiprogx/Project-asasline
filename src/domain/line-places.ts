/**
 * Where a booking's empty box is collected and its full one delivered: location contacts
 * linked under a shipping line with the Depot or Terminal role (legacy pickupOptions,
 * terminalOptions over the line's child addresses). A terminal shared by several lines is
 * one contact, linked under each; the line's own come first and the latest linked is the
 * default. Any other place with the role, then any other location, may still be picked: a
 * depot is not always linked under the line that uses it.
 */
/** The booking's places, stored by contact id as its parties are (booking-parties PARTY_KEYS). */
export const PLACE_KEYS = ["pickupDepotId", "terminalId"] as const;

export type LinePlace = {
  value: string;
  label: string;
  /** The contacts it is linked under with this role, the most recently linked first. */
  under: readonly string[];
  /** The names of the contacts it is linked under, searched, never shown (search-picker). */
  keywords?: string;
};

const ofLine = (places: readonly LinePlace[], lineId: string | null) =>
  lineId ? places.filter((p) => p.under.includes(lineId)) : [];

const byLabel = (a: LinePlace, b: LinePlace) => a.label.localeCompare(b.label);

/**
 * The line's own places first, as linked (latest first), then every other with the role, then
 * every other location (`others`, those with the role left out), each group by name.
 */
export function placesForLine(
  places: readonly LinePlace[],
  lineId: string | null,
  others: readonly LinePlace[] = [],
): LinePlace[] {
  const own = ofLine(places, lineId);
  const rest = places.filter((p) => !own.includes(p)).sort(byLabel);
  const seen = new Set(places.map((p) => p.value));
  const elsewhere = others.filter((p) => !seen.has(p.value)).sort(byLabel);
  return [...own, ...rest, ...elsewhere];
}

/** What a booking with this line starts with: its latest linked place; none when it has none. */
export function defaultPlace(places: readonly LinePlace[], lineId: string | null): string | null {
  return ofLine(places, lineId)[0]?.value ?? null;
}

/** A place as the picker and the paper write it: "Name — Kaai 1, 2000 Antwerpen". */
export function placeLabel(p: {
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
}): string {
  const where = [p.street, [p.zip, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return where ? `${p.name} — ${where}` : p.name;
}
