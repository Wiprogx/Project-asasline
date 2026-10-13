import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { contactAddresses, contacts } from "@/server/db/schema";

const DEPOT = /pick.?up|depot|dépôt/i;
const TERMINAL = /terminal/i;

/**
 * Where an empty box is collected and a full one delivered (legacy pickupOptions, terminalOptions):
 * contacts tagged or named for it, and addresses whose type says so — offered as the desk types,
 * never imposed (a new depot is typed and kept as written).
 */
export async function bookingPlaces(): Promise<{ depots: string[]; terminals: string[] }> {
  await requirePermission("app.bookings");
  return cached("bookings:places", { ttlSeconds: 300, tags: [tags.contacts] }, async () => {
    const [people, addresses] = await Promise.all([
      db
        .select({ name: contacts.name, tags: contacts.tags, professions: contacts.professions })
        .from(contacts)
        .where(isNull(contacts.archivedAt)),
      db
        .select({
          type: contactAddresses.type,
          name: contactAddresses.name,
          city: contactAddresses.city,
          owner: contacts.name,
        })
        .from(contactAddresses)
        .innerJoin(contacts, eq(contacts.id, contactAddresses.contactId))
        .where(and(isNull(contactAddresses.archivedAt), isNull(contacts.archivedAt))),
    ]);
    const pick = (re: RegExp) =>
      [
        ...new Set([
          ...people
            .filter(
              (c) =>
                re.test(c.name) ||
                [...(c.tags ?? []), ...(c.professions ?? [])].some((t) => re.test(t)),
            )
            .map((c) => c.name),
          ...addresses
            .filter((a) => re.test(a.type) || re.test(a.name ?? ""))
            .map((a) => [a.name || a.owner, a.city].filter(Boolean).join(", ")),
        ]),
      ].sort();
    return { depots: pick(DEPOT), terminals: pick(TERMINAL) };
  });
}
