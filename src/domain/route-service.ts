/**
 * A destination's service (legacy routeDoor): from the port, or collected at the customer's door
 * with the inland leg priced in. A door service has a loading address.
 */
export const ROUTE_SERVICES = ["port_port", "door_port"] as const;
export type RouteService = (typeof ROUTE_SERVICES)[number];

export const ROUTE_SERVICE_LABELS: Record<RouteService, string> = {
  port_port: "Port to port",
  door_port: "Door to port — inland transport included",
};

/**
 * A stop of a destination or of one of its boxes (legacy stops): one of the customer's places
 * (a location contact), and when the truck calls there.
 */
export type RouteStop = { contactId: string; date: string | null; time: string | null };

/** A product in a box: its HS code (Settings › HS codes) and, when the list has none, its words. */
export type RouteHs = { code: string; description: string | null };

/**
 * One container of a destination (legacy qb-row, a box's hs[]): its loading mode, address and
 * stops, and what it carries — one HS row per product.
 */
export type RouteBox = {
  loadingMode: string | null;
  loadAddressId: string | null;
  stops: RouteStop[];
  hs: RouteHs[];
};

/** What a quotation ships, in words, from every box's HS rows: "630900 Worn clothes, 940360". */
export const commodityWords = (boxes: readonly { hs: readonly RouteHs[] }[]) => {
  const seen = new Set<string>();
  return boxes
    .flatMap((b) => b.hs)
    .filter((h) => !seen.has(h.code) && seen.add(h.code))
    .map((h) => [h.code, h.description].filter(Boolean).join(" "))
    .join(", ");
};

/** An address as one line, for the trucker copy and the booking's box: "Kaai 1, 2000 Antwerpen, BE". */
export const stopAddress = (s: {
  street: string;
  zip: string | null;
  city: string;
  country: string;
}) => [s.street, [s.zip, s.city].filter(Boolean).join(" "), s.country].filter(Boolean).join(", ");
