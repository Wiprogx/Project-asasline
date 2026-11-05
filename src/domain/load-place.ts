/**
 * Where a booking's boxes are loaded by default (legacy loadAddrsOf): the customer's delivery
 * address when it has one, else the customer's own address — offered among its other linked
 * locations, any of which may be picked instead.
 */
export type CustomerPlace = { value: string; label: string; delivery: boolean };

export type PlaceOption = { value: string; label: string };

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
 * well be loaded at a place of another contact. Each place once, in the order it first comes.
 */
export function loadPlaces(
  customer: readonly CustomerPlace[],
  locations: readonly PlaceOption[],
): PlaceOption[] {
  const seen = new Set<string>();
  const out: PlaceOption[] = [];
  for (const p of [...customer, ...locations]) {
    if (seen.has(p.value)) continue;
    seen.add(p.value);
    out.push({ value: p.value, label: p.label });
  }
  return out;
}
