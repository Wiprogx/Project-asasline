import "server-only";
import { and, asc, eq, ilike, inArray, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { contactAddresses, contacts } from "@/server/db/schema";

export type ContactRow = {
  id: string;
  name: string;
  type: "company" | "person";
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  vat: string | null;
  archived: boolean;
};

/** Search matches the contact and its child addresses (legacy contactHay). */
export async function listContacts(opts: { q?: string; archived?: boolean } = {}) {
  await requirePermission("app.contacts");
  const q = opts.q?.trim() ?? "";
  const archived = !!opts.archived;
  return cached(
    `contacts:list:${archived}:${q.toLowerCase()}`,
    { ttlSeconds: 60, tags: [tags.contacts] },
    async () => {
      const where: SQL[] = [
        archived ? isNotNull(contacts.archivedAt) : isNull(contacts.archivedAt),
      ];
      if (q) {
        const like = `%${q}%`;
        const inChildren = db
          .select({ id: contactAddresses.contactId })
          .from(contactAddresses)
          .where(or(ilike(contactAddresses.name, like), ilike(contactAddresses.city, like)));
        where.push(
          or(
            ilike(contacts.name, like),
            ilike(contacts.email, like),
            ilike(contacts.vat, like),
            ilike(contacts.city, like),
            inArray(contacts.id, inChildren),
          )!,
        );
      }
      const rows = await db
        .select({
          id: contacts.id,
          name: contacts.name,
          type: contacts.type,
          country: contacts.country,
          city: contacts.city,
          email: contacts.email,
          phone: contacts.phone,
          vat: contacts.vat,
          archivedAt: contacts.archivedAt,
        })
        .from(contacts)
        .where(and(...where))
        .orderBy(asc(contacts.name))
        .limit(500);
      return rows.map(({ archivedAt, ...r }): ContactRow => ({
        ...r,
        archived: archivedAt !== null,
      }));
    },
  );
}

export async function getContact(id: string) {
  await requirePermission("app.contacts");
  return db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: { addresses: { where: isNull(contactAddresses.archivedAt) }, bankAccounts: true },
  });
}

/** Live contacts for pickers (client, shipper, consignee…). */
export async function contactOptions() {
  await requirePermission("app.contacts");
  return cached("contacts:options", { ttlSeconds: 300, tags: [tags.contacts] }, () =>
    db
      .select({ id: contacts.id, name: contacts.name, country: contacts.country })
      .from(contacts)
      .where(isNull(contacts.archivedAt))
      .orderBy(asc(contacts.name)),
  );
}
