"use server";

import { changesOf } from "@/domain/changes";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { labelsOf, setContactLabels } from "@/server/contact-labels";
import { db } from "@/server/db/client";
import { bookings, contacts } from "@/server/db/schema";
import { isPartyOn } from "@/server/booking-parties";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { postedRow, toRow, wordsOf } from "./contact-row";
import { refused } from "./save-checks";
import { archiveSchema, checkedContactSchema, versionRef } from "./schemas";
import { readIdFormats } from "@/server/id-config";
import { langOf } from "@/domain/countries";
import { readCountries } from "@/server/country-config";

async function settle(id: string) {
  // The bookings and quotations lists are cached with the contact's name on them.
  await invalidateTags(tags.contacts, tags.contact(id), tags.bookings, tags.quotations);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
}

export async function createContact(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = checkedContactSchema(await readIdFormats()).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const taken = await refused(parsed.data);
  if (taken) return taken;

  // No language chosen: the one the office writes to that country in (legacy langOf).
  const lang = parsed.data.lang ?? langOf(await readCountries(), parsed.data.country);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contacts)
      .values({ ...toRow(parsed.data), lang, createdBy: user.id, updatedBy: user.id })
      .returning({ id: contacts.id });
    await setContactLabels(tx, row.id, wordsOf(parsed.data), user.id);
    await audit(tx, {
      action: "contact.create",
      userId: user.id,
      entity: "contact",
      entityId: row.id,
    });
    return row.id;
  });
  await settle(id);
  redirect(`/contacts/${id}`);
}

/** What the contact points at now: a pick it already has is kept, even off its list since. */
const picksOf = (id: string) =>
  db
    .select({
      id: contacts.id,
      salutationId: contacts.salutationId,
      paymentTermId: contacts.paymentTermId,
      country: contacts.country,
    })
    .from(contacts)
    .where(eq(contacts.id, id))
    .then(([row]) => row);

export async function updateContact(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const raw = formToObject(fd);
  const ref = versionRef.safeParse(raw);
  const parsed = checkedContactSchema(await readIdFormats()).safeParse(raw);
  if (!ref.success) return invalid(ref.error);
  if (!parsed.success) return invalid(parsed.error);
  const taken = await refused(parsed.data, await picksOf(ref.data.id));
  if (taken) return taken;
  try {
    await db.transaction(async (tx) => {
      // A number that changed is a number not yet checked against the register.
      const [cur] = await tx.select().from(contacts).where(eq(contacts.id, ref.data.id));
      const before = await labelsOf(tx, ref.data.id);
      const values = postedRow(parsed.data, (k) => fd.has(k));
      const changed = (k: "vat" | "eori") =>
        k in values && (values[k] ?? null) !== (cur?.[k] ?? null);
      const unchecked = {
        ...(changed("vat") ? { vatCheckedOn: null } : {}),
        ...(changed("eori") ? { eoriCheckedOn: null } : {}),
      };
      await updateVersioned(
        tx,
        contacts,
        ref.data.id,
        ref.data.version,
        { ...values, ...unchecked, updatedBy: user.id },
        "This contact",
      );
      await setContactLabels(tx, ref.data.id, wordsOf(parsed.data), user.id);
      await audit(tx, {
        action: "contact.update",
        userId: user.id,
        entity: "contact",
        entityId: ref.data.id,
        detail: {
          changes: changesOf({ ...cur, ...before }, { ...values, ...wordsOf(parsed.data) }),
        },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await settle(ref.data.id);
  return { ok: true, data: undefined, message: "Saved" };
}

/**
 * Archive instead of delete (invariant 1). Refused while the contact is a party on a live
 * shipment: archiving it would leave that booking pointing at a hidden record.
 */
export async function archiveContact(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = archiveSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;

  const inUse = await db
    .select({ ref: bookings.ref })
    .from(bookings)
    .where(and(ne(bookings.status, "cancelled"), isPartyOn(id)))
    .limit(3);
  if (inUse.length)
    return fail(
      `Still a party on ${inUse.map((b) => b.ref).join(", ")}. Change those bookings first.`,
    );

  try {
    await db.transaction(async (tx) => {
      await updateVersioned(
        tx,
        contacts,
        id,
        version,
        { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason },
        "This contact",
      );
      await audit(tx, {
        action: "contact.archive",
        userId: user.id,
        entity: "contact",
        entityId: id,
        detail: { reason },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await settle(id);
  return { ok: true, data: undefined, message: "Archived" };
}

export async function restoreContact(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = versionRef.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    await db.transaction(async (tx) => {
      await updateVersioned(
        tx,
        contacts,
        parsed.data.id,
        parsed.data.version,
        { archivedAt: null, archivedBy: null, archivedReason: null },
        "This contact",
      );
      await audit(tx, {
        action: "contact.restore",
        userId: user.id,
        entity: "contact",
        entityId: parsed.data.id,
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await settle(parsed.data.id);
  return { ok: true, data: undefined, message: "Put back" };
}
