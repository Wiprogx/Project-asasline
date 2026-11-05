import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { type RolePlaces, rolePlaces } from "@/server/line-places";

/**
 * Where an empty box is collected and a full one delivered (legacy pickupOptions,
 * terminalOptions): the locations linked to a contact as its Depot or Terminal, each naming
 * the lines it belongs to, so the form offers the booking's line's own first.
 */
export async function bookingPlaces(): Promise<RolePlaces> {
  await requirePermission("app.bookings");
  return cached("bookings:places", { ttlSeconds: 300, tags: [tags.contacts] }, () =>
    rolePlaces(db),
  );
}
