"use server";

import { and, eq, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fail, formToObject, invalid, nullMissing } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { bookings, contacts } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { archiveSchema, type ContactInput, contactSchema, versionRef } from "./schemas";

// Optional contact fields a person may empty; creditLimit is already mapped to null.
const CLEARABLE = Object.keys(contactSchema.shape).filter((k) => k !== "creditLimit");

const toRow = ({ creditLimit, ...rest }: ContactInput) => ({
  ...rest,
  creditLimitCents: creditLimit,
});

async function settle(id: string) {
  await invalidateTags(tags.contacts, tags.contact(id));
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
}

export async function createContact(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = contactSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contacts)
      .values({ ...toRow(parsed.data), createdBy: user.id, updatedBy: user.id })
      .returning({ id: contacts.id });
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

export async function updateContact(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const raw = formToObject(fd);
  const ref = versionRef.safeParse(raw);
  const parsed = contactSchema.safeParse(raw);
  if (!ref.success) return invalid(ref.error);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await db.transaction(async (tx) => {
      await updateVersioned(
        tx,
        contacts,
        ref.data.id,
        ref.data.version,
        { ...nullMissing(toRow(parsed.data), CLEARABLE), updatedBy: user.id },
        "This contact",
      );
      await audit(tx, {
        action: "contact.update",
        userId: user.id,
        entity: "contact",
        entityId: ref.data.id,
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
    .where(
      and(
        ne(bookings.status, "cancelled"),
        or(
          eq(bookings.clientId, id),
          eq(bookings.payerId, id),
          eq(bookings.shipperId, id),
          eq(bookings.consigneeId, id),
          eq(bookings.notifyId, id),
        ),
      ),
    )
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
