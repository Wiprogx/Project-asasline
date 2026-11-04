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
import { isRefusal, registerChecks, verdictWords } from "./register-checks";
import { refused } from "./save-checks";
import { archiveSchema, checkedContactSchema, versionRef } from "./schemas";
import { readIdFormats } from "@/server/id-config";
import { langOf } from "@/domain/countries";
import { readCountries } from "@/server/countries";
import { withCities } from "@/server/cities";

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
  // Its numbers asked of their registers (VIES, EORI): known, they carry today as their check day.
  const checks = await registerChecks(parsed.data, (k) => !!parsed.data[k]);
  if (isRefusal(checks)) return checks;

  // No language chosen: the one the office writes to that country in (legacy langOf).
  const lang = parsed.data.lang ?? langOf(await readCountries(), parsed.data.country);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contacts)
      .values({
        ...toRow(parsed.data),
        ...checks.stamps,
        lang,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: contacts.id });
    await setContactLabels(tx, row.id, wordsOf(parsed.data), user.id);
    await audit(tx, {
      action: "contact.create",
      userId: user.id,
      entity: "contact",
      entityId: row.id,
      detail: Object.keys(checks.found).length ? { registers: checks.found } : undefined,
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
      cityId: contacts.cityId,
      zip: contacts.zip,
      vat: contacts.vat,
      eori: contacts.eori,
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
  const picks = await picksOf(ref.data.id);
  const taken = await refused(parsed.data, picks);
  if (taken) return taken;
  const values = postedRow(parsed.data, (k) => fd.has(k));
  // A number that changed is asked of its register again: known, checked today; else unchecked.
  const changed = (k: "vat" | "eori") =>
    k in values && (values[k] ?? null) !== (picks?.[k] ?? null);
  const checks = await registerChecks(parsed.data, changed);
  if (isRefusal(checks)) return checks;
  try {
    await db.transaction(async (tx) => {
      const [cur] = await tx.select().from(contacts).where(eq(contacts.id, ref.data.id));
      const before = await labelsOf(tx, ref.data.id);
      await updateVersioned(
        tx,
        contacts,
        ref.data.id,
        ref.data.version,
        { ...values, ...checks.stamps, updatedBy: user.id },
        "This contact",
      );
      await setContactLabels(tx, ref.data.id, wordsOf(parsed.data), user.id);
      // The history says the city by its name ("Gent → Brussels"), never by its row's id.
      const cityName = async (id: unknown) =>
        typeof id === "string" ? ((await withCities([{ cityId: id }], tx))[0]?.city ?? null) : null;
      const after = { ...values, ...wordsOf(parsed.data), city: await cityName(values.cityId) };
      const fields = Object.keys(after).filter(
        (k) => k !== "cityId" && (k !== "city" || "cityId" in values),
      );
      await audit(tx, {
        action: "contact.update",
        userId: user.id,
        entity: "contact",
        entityId: ref.data.id,
        detail: {
          changes: changesOf(
            { ...cur, ...before, city: await cityName(cur?.cityId) },
            after,
            fields,
          ),
          ...(Object.keys(checks.found).length ? { registers: checks.found } : {}),
        },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await settle(ref.data.id);
  const said = Object.entries(checks.found).map(([kind, f]) =>
    verdictWords(kind as "vat" | "eori", f.register, { state: "valid", ...f }),
  );
  return { ok: true, data: undefined, message: ["Saved", ...said, ...checks.notes].join(" · ") };
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
