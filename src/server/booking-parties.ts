import "server-only";
import { eq, or, type SQL } from "drizzle-orm";
import { PARTY_KEYS } from "@/domain/booking-parties";
import { bookings } from "./db/schema";

/** The contact is on the booking in any role (domain/booking-parties): one list, every query. */
export const isPartyOn = (contactId: string): SQL =>
  or(...PARTY_KEYS.map((k) => eq(bookings[k], contactId))) as SQL;
