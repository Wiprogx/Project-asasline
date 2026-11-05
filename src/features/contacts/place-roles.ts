import { DELIVERY_ROLE, PLACE_ROLE_CODES, type PlaceRole } from "@/domain/lookup-tables";

/** The roles a place made from a form is linked under: the customer's, or a line's. */
export type LinkedPlaceRole = "delivery" | PlaceRole;

export const PLACE_ROLE_CODE: Record<LinkedPlaceRole, string> = {
  delivery: DELIVERY_ROLE,
  depot: PLACE_ROLE_CODES.depot,
  terminal: PLACE_ROLE_CODES.terminal,
};

/** How the dialog speaks of each: what it makes, whose it is, what it is called, where it is offered. */
export const PLACE_WORDS: Record<
  LinkedPlaceRole,
  { noun: string; owner: string; role: string; next: string }
> = {
  delivery: { noun: "location", owner: "customer", role: "Delivery address", next: "quotations" },
  depot: { noun: "depot", owner: "shipping line", role: "Depot", next: "bookings" },
  terminal: { noun: "terminal", owner: "shipping line", role: "Terminal", next: "bookings" },
};
