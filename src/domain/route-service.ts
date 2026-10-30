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

/** A stop of a destination (legacy stops): a location contact, and when the truck calls there. */
export type RouteStop = { contactId: string; date: string | null; time: string | null };
