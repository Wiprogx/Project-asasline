import { cache } from "react";
import "server-only";
import { asc, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { labelsOf, professionsOf, tagsOf } from "@/server/contact-labels";
import { db } from "@/server/db/client";
import { contactAddresses, contactBankAccounts, contacts } from "@/server/db/schema";

/** One contact with its addresses and accounts; cached per request (layout + page share it). */
export const getContact = cache(async (id: string) => {
  await requirePermission("app.contacts");
  const row = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: {
      addresses: { where: isNull(contactAddresses.archivedAt) },
      bankAccounts: { where: isNull(contactBankAccounts.archivedAt) },
    },
  });
  // Its professions and tags, in words (Settings › Lists).
  return row && { ...row, ...(await labelsOf(db, row.id)) };
});

/** Live contacts for pickers (client, shipper, consignee…). */
export async function contactOptions() {
  await requirePermission("app.contacts");
  // Industries and tags come along: a booking's pickers list the contacts that fit the role first.
  return cached("contacts:options:v2", { ttlSeconds: 300, tags: [tags.contacts] }, () =>
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        country: contacts.country,
        professions: professionsOf(),
        tags: tagsOf(),
      })
      .from(contacts)
      .where(isNull(contacts.archivedAt))
      .orderBy(asc(contacts.name)),
  );
}
