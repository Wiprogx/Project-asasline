/**
 * Where a booking's boxes are loaded by default (legacy loadAddrsOf): the customer's delivery
 * address when it has one, else the customer's own address — offered among its other linked
 * locations, any of which may be picked instead.
 */
export type CustomerPlace = { value: string; label: string; delivery: boolean; keywords?: string };

/** A place; `keywords` are the names of the contacts it is linked under, searched, never shown. */
export type PlaceOption = { value: string; label: string; keywords?: string };

export function defaultLoadPlace(
  places: readonly CustomerPlace[],
  clientId: string | null,
): string | null {
  if (!clientId) return null;
  return (
    places.find((p) => p.delivery)?.value ?? places.find((p) => p.value === clientId)?.value ?? null
  );
}

/**
 * What a loading-address picker offers: the customer's places first — its delivery address,
 * its other linked locations, its own address — then every other location, since a box may
 * well be loaded at a place of another contact. Each place once, named as it first comes, and
 * found by the name of any contact it is linked under: the customer's name finds its own
 * address and every place linked to it, another company's name its own and its places.
 */
export function loadPlaces(
  customer: readonly CustomerPlace[],
  locations: readonly PlaceOption[],
): PlaceOption[] {
  const out = new Map<string, PlaceOption>();
  for (const p of [...customer, ...locations]) {
    const first = out.get(p.value);
    if (!first) out.set(p.value, { value: p.value, label: p.label, keywords: p.keywords });
    else first.keywords = mergeWords(first.keywords, p.keywords);
  }
  return [...out.values()].map((p) => (p.keywords ? p : { value: p.value, label: p.label }));
}

/** Both sets of words, each once. */
function mergeWords(a: string | undefined, b: string | undefined): string | undefined {
  const words = [...new Set(`${a ?? ""} ${b ?? ""}`.split(" ").filter(Boolean))];
  return words.length ? words.join(" ") : undefined;
}
