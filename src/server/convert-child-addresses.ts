import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { childToContact } from "@/domain/contact-links";
import { ensureLookup } from "./lookups";
import { audit } from "./audit";
import { db } from "./db/client";
import { contactAddresses, contactLinks, contacts } from "./db/schema";

const MOVED = "Moved to contacts: now its own contact, linked";

/**
 * Every live child address becomes a contact of its own (a person or a location) linked to its
 * parent with its kind as the role; the child row is archived with the reason, never deleted.
 * Idempotent: a second run finds nothing live to move. Run after a legacy import too.
 */
export async function convertChildAddresses(userId: string | null = null) {
  const rows = await db
    .select({
      child: contactAddresses,
      parent: { name: contacts.name, lang: contacts.lang, country: contacts.country },
    })
    .from(contactAddresses)
    .innerJoin(contacts, eq(contacts.id, contactAddresses.contactId))
    .where(isNull(contactAddresses.archivedAt));
  for (const { child, parent } of rows) {
    const { role, ...draft } = childToContact(child, parent);
    const kind = draft.type === "location" ? "location-roles" : "person-roles";
    await db.transaction(async (tx) => {
      const [made] = await tx
        .insert(contacts)
        .values({ ...draft, createdBy: userId, updatedBy: userId })
        .returning({ id: contacts.id });
      await tx.insert(contactLinks).values({
        contactId: child.contactId,
        linkedId: made.id,
        [kind === "location-roles" ? "locationRoleId" : "personRoleId"]: await ensureLookup(
          tx,
          kind,
          role,
        ),
        createdBy: userId,
      });
      await tx
        .update(contactAddresses)
        .set({ archivedAt: new Date(), archivedBy: userId, archivedReason: MOVED })
        .where(and(eq(contactAddresses.id, child.id), isNull(contactAddresses.archivedAt)));
      await audit(tx, {
        action: "contact.link.add",
        userId,
        entity: "contact",
        entityId: child.contactId,
        detail: { linked: made.id, role, fromAddress: child.id },
      });
    });
  }
  return rows.length;
}
