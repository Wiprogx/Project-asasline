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

/** What a service moves, said at the top of a destination: ocean freight alone, or the inland leg with it. */
export const ROUTE_SERVICE_FREIGHT: Record<RouteService, string> = {
  port_port: "Ocean freight",
  door_port: "Inland transport + ocean freight",
};

/**
 * A stop of a destination or of one of its boxes (legacy stops): one of the customer's places
 * (a location contact), and when the truck calls there.
 */
/**
 * A stop on the way: one of the customer's places, when the truck is expected there — delivered
 * there, under a drop mode — how the box is handled there (a loading mode of its own, or none
 * said) and, dropped there, when it is picked back.
 */
export type RouteStop = {
  contactId: string;
  date: string | null;
  time: string | null;
  loadingMode?: string | null;
  pickBackDate?: string | null;
  pickBackTime?: string | null;
};

/** A product in a box: its HS code (Settings › HS codes) and, when the list has none, its words. */
export type RouteHs = { code: string; description: string | null };

/**
 * One container of a destination (legacy qb-row, a box's hs[]): its loading mode, address and
 * stops, and what it carries — one HS row per product. The loading moment the booking will
 * ask is agreed here: under direct loading the day and hour the truck loads (`loadDate`,
 * `loadTime`); under a drop mode (chassis disconnected, box on the ground) when the box is
 * delivered to the address and when it is picked back, each a day and an hour
 * (domain/moments); a box quoted before they were asked has none.
 */
export type RouteBox = {
  loadingMode: string | null;
  loadAddressId: string | null;
  stops: RouteStop[];
  hs: RouteHs[];
  loadDate?: string | null;
  loadTime?: string | null;
  pickBackDate?: string | null;
  pickBackTime?: string | null;
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
