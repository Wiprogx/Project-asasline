"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { langOf } from "@/domain/countries";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { cityProblem } from "@/server/cities";
import { postcodeProblem } from "@/server/postcodes";
import { readCountries } from "@/server/countries";
import { setContactLabels } from "@/server/contact-labels";
import { db } from "@/server/db/client";
import { contactLinks, contacts } from "@/server/db/schema";
import { readIdFormats } from "@/server/id-config";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { editLinkedSchema, linkExistingSchema, linkNewSchema, unlinkSchema } from "./link-schemas";
import { linkRole, typesOf } from "./link-roles";
import { checkedContactSchema, contactSchema } from "./schemas";

const CONTACT_KEYS = Object.keys(contactSchema.shape) as (keyof typeof contactSchema.shape)[];

async function settle(...ids: string[]) {
  await invalidateTags(tags.contacts, ...ids.map((id) => tags.contact(id)));
  for (const id of ids) revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
}

/** A live link between the two already, whichever end it was made from. */
async function alreadyLinked(a: string, b: string, roleId: string) {
  const [row] = await db
    .select({ id: contactLinks.id })
    .from(contactLinks)
    .where(
      and(
        isNull(contactLinks.archivedAt),
        or(eq(contactLinks.personRoleId, roleId), eq(contactLinks.locationRoleId, roleId)),
        or(
          and(eq(contactLinks.contactId, a), eq(contactLinks.linkedId, b)),
          and(eq(contactLinks.contactId, b), eq(contactLinks.linkedId, a)),
        ),
      ),
    )
    .limit(1);
  return !!row;
}

/** An existing contact linked with a role: never the contact itself, never an archived one, never twice. */
async function linkExisting(raw: Record<string, string | undefined>, userId: string) {
  const parsed = linkExistingSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { contactId, linkedId, roleId } = parsed.data;
  const [other] = await db
    .select({ archivedAt: contacts.archivedAt })
    .from(contacts)
    .where(eq(contacts.id, linkedId));
  if (!other || other.archivedAt || linkedId === contactId)
    return {
      ok: false as const,
      error: "Pick a contact from the list",
      fieldErrors: { linkedId: ["Pick a contact from the list"] },
    };
  const types = await typesOf(db, [contactId, linkedId]);
  const picked = await linkRole(db, [types.get(contactId)!, types.get(linkedId)!], roleId);
  if (!picked) return fail("Pick a role from the list");
  const role = picked.label;
  if (await alreadyLinked(contactId, linkedId, roleId)) return fail(`Already linked as ${role}`);
  await db.transaction(async (tx) => {
    await tx
      .insert(contactLinks)
      .values({ contactId, linkedId, ...picked.values, createdBy: userId, updatedBy: userId });
    await audit(tx, {
      action: "contact.link.add",
      userId,
      entity: "contact",
      entityId: contactId,
      detail: { linked: linkedId, role },
    });
  });
  await settle(contactId, linkedId);
  return { ok: true as const, data: undefined, message: `Linked as ${role}` };
}

/** A new person or location, checked as any contact is, made and linked in one transaction. */
async function linkNew(raw: Record<string, string | undefined>, userId: string) {
  const ref = linkNewSchema.safeParse(raw);
  if (!ref.success) return invalid(ref.error);
  const parsed = checkedContactSchema(await readIdFormats()).safeParse({
    ...raw,
    type: ref.data.type,
  });
  if (!parsed.success) return invalid(parsed.error);
  const { contactId, roleId, type } = ref.data;
  const types = await typesOf(db, [contactId]);
  const picked = await linkRole(db, [types.get(contactId) ?? "company", type], roleId);
  if (!picked) return fail("Pick a role from the list");
  const role = picked.label;
  const { creditLimit, professions, tags: words, ...fields } = parsed.data;
  const city =
    (await cityProblem(db, fields.cityId, fields.country)) ??
    (await postcodeProblem(db, fields.zip, fields.country));
  if (city) return fail(city);
  const lang = fields.lang ?? langOf(await readCountries(), fields.country);
  const id = await db.transaction(async (tx) => {
    const [made] = await tx
      .insert(contacts)
      .values({
        ...fields,
        creditLimitCents: creditLimit,
        lang,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: contacts.id });
    await setContactLabels(tx, made.id, { professions, tags: words }, userId);
    await tx.insert(contactLinks).values({
      contactId,
      linkedId: made.id,
      ...picked.values,
      createdBy: userId,
      updatedBy: userId,
    });
    await audit(tx, { action: "contact.create", userId, entity: "contact", entityId: made.id });
    await audit(tx, {
      action: "contact.link.add",
      userId,
      entity: "contact",
      entityId: contactId,
      detail: { linked: made.id, role },
    });
    return made.id;
  });
  await settle(contactId, id);
  return { ok: true as const, data: undefined, message: `${fields.name} added as ${role}` };
}

/** "+ Add person" / "+ Add location": an existing contact picked, or a new one typed. */
export async function addLinked(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const raw = formToObject(fd);
  return fd.has("linkedId") ? linkExisting(raw, user.id) : linkNew(raw, user.id);
}

/**
 * A linked contact corrected from its dialog: the link's role, and the contact's fields that
 * the dialog shows — only those, so what it does not show (tags, billing…) is left as it is.
 */
export async function updateLinked(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const raw = formToObject(fd);
  const ref = editLinkedSchema.safeParse(raw);
  if (!ref.success) return invalid(ref.error);
  const parsed = checkedContactSchema(await readIdFormats()).safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { contactId, linkId, linkVersion, linkedId, linkedVersion, roleId } = ref.data;
  const [link] = await db.select().from(contactLinks).where(eq(contactLinks.id, linkId));
  if (!link) return fail("This link was removed meanwhile");
  const types = await typesOf(db, [link.contactId, link.linkedId]);
  const ends: [string, string] = [types.get(link.contactId)!, types.get(link.linkedId)!];
  const picked = await linkRole(db, ends, roleId, link.personRoleId ?? link.locationRoleId);
  if (!picked) return fail("Pick a role from the list");
  const role = picked.label;
  const [before] = await db
    .select({ cityId: contacts.cityId, zip: contacts.zip, country: contacts.country })
    .from(contacts)
    .where(eq(contacts.id, linkedId));
  const d = parsed.data;
  const zipFresh = d.zip !== before?.zip || d.country !== before?.country;
  const city =
    (await cityProblem(db, d.cityId, d.country, before?.cityId)) ??
    (zipFresh ? await postcodeProblem(db, d.zip, d.country) : null);
  if (city) return fail(city);
  const shown = CONTACT_KEYS.filter((k) => fd.has(k) && k !== "creditLimit");
  const values = Object.fromEntries(shown.map((k) => [k, parsed.data[k] ?? null]));
  try {
    await db.transaction(async (tx) => {
      const by = { updatedBy: user.id };
      await updateVersioned(
        tx,
        contacts,
        linkedId,
        linkedVersion,
        { ...values, name: parsed.data.name, ...by },
        "This contact",
      );
      await updateVersioned(
        tx,
        contactLinks,
        linkId,
        linkVersion,
        { ...picked.values, ...by },
        "This link",
      );
      await audit(tx, {
        action: "contact.update",
        userId: user.id,
        entity: "contact",
        entityId: linkedId,
        detail: { fields: shown, role },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await settle(contactId, linkedId);
  return { ok: true, data: undefined, message: "Saved" };
}

/** Unlinked with a reason, never deleted: the contact itself stays, and so does the history. */
export async function unlink(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = unlinkSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { contactId, linkId, reason } = parsed.data;
  const [row] = await db
    .update(contactLinks)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(and(eq(contactLinks.id, linkId), isNull(contactLinks.archivedAt)))
    .returning({ contactId: contactLinks.contactId, linkedId: contactLinks.linkedId });
  if (!row) return fail("This link was already removed");
  await audit(db, {
    action: "contact.link.remove",
    userId: user.id,
    entity: "contact",
    entityId: contactId,
    detail: { link: linkId, reason },
  });
  await settle(row.contactId, row.linkedId);
  return { ok: true, data: undefined, message: "Unlinked" };
}
