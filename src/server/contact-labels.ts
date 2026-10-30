import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbOrTx } from "./db/client";
import { contactProfessions, contacts, contactTags } from "./db/schema";
import { ensureLookup } from "./lookups";

/**
 * A contact's words of one open list, in the list's order: a subquery for a select from
 * `contacts`. Every name is written in full — drizzle leaves the table off a column in a
 * one-table select, and a bare "id" would be the join table's own.
 */
const wordsOf = (join: string, list: string, fk: string) =>
  sql.raw(`coalesce((select array_agg("${list}"."label" order by "${list}"."position", "${list}"."label")
    from "${join}" join "${list}" on "${list}"."id" = "${join}"."${fk}"
    where "${join}"."contact_id" = "contacts"."id" and "${join}"."archived_at" is null), '{}')`);

/** A contact's professions in words (Settings › Lists › Professions). */
export const professionsOf = () =>
  sql<string[]>`${wordsOf("contact_professions", "professions", "profession_id")}`;

/** A contact's tags in words (Settings › Lists › Contact tags). */
export const tagsOf = () => sql<string[]>`${wordsOf("contact_tags", "tags", "tag_id")}`;

/** One contact's professions and tags in words. */
export async function labelsOf(tx: DbOrTx, contactId: string) {
  const [row] = await tx
    .select({ professions: professionsOf(), tags: tagsOf() })
    .from(contacts)
    .where(eq(contacts.id, contactId));
  return row ?? { professions: [], tags: [] };
}

/**
 * The professions and tags typed on the contact's form, as rows: a word the list does not hold
 * yet is added to it (they are offered as one types, never a closed list), and the contact's
 * previous ones are archived, never deleted.
 */
export async function setContactLabels(
  tx: DbOrTx,
  contactId: string,
  words: { professions: readonly string[]; tags: readonly string[] },
  userId: string | null,
) {
  const gone = { archivedAt: new Date(), archivedBy: userId, archivedReason: "Replaced on save" };
  const by = { createdBy: userId, updatedBy: userId };
  await tx
    .update(contactProfessions)
    .set(gone)
    .where(and(eq(contactProfessions.contactId, contactId), isNull(contactProfessions.archivedAt)));
  await tx
    .update(contactTags)
    .set(gone)
    .where(and(eq(contactTags.contactId, contactId), isNull(contactTags.archivedAt)));
  const professionIds = new Set<string>();
  for (const w of words.professions) professionIds.add(await ensureLookup(tx, "professions", w));
  const tagIds = new Set<string>();
  for (const w of words.tags) tagIds.add(await ensureLookup(tx, "contact-tags", w));
  if (professionIds.size)
    await tx
      .insert(contactProfessions)
      .values([...professionIds].map((professionId) => ({ contactId, professionId, ...by })));
  if (tagIds.size)
    await tx.insert(contactTags).values([...tagIds].map((tagId) => ({ contactId, tagId, ...by })));
}
