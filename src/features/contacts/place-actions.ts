"use server";

import { langOf } from "@/domain/countries";
import { DELIVERY_ROLE } from "@/domain/lookup-tables";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { readCountries } from "@/server/countries";
import { setContactLabels } from "@/server/contact-labels";
import { db } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { readIdFormats } from "@/server/id-config";
import { lookupIdByCode } from "@/server/lookups";
import { toRow, wordsOf } from "./contact-row";
import { linkNew } from "./link-actions";
import { refused } from "./save-checks";
import { checkedContactSchema } from "./schemas";

type Place = { value: string; label: string };

/** As the picker shows a place: "Name (Delivery address) — Kaai 1, 2000". */
const labelOf = (name: string, raw: Record<string, string | undefined>, linked: boolean) => {
  const where = [raw.street, raw.zip].filter(Boolean).join(", ");
  return `${name}${linked ? " (Delivery address)" : ""}${where ? ` — ${where}` : ""}`;
};

/** A location contact of its own (no customer chosen yet), checked as any contact is. */
async function createLocation(
  raw: Record<string, string | undefined>,
  userId: string,
): Promise<ActionResult<Place>> {
  const parsed = checkedContactSchema(await readIdFormats()).safeParse({
    ...raw,
    type: "location",
  });
  if (!parsed.success) return invalid(parsed.error);
  const taken = await refused(parsed.data);
  if (taken) return taken;
  const lang = parsed.data.lang ?? langOf(await readCountries(), parsed.data.country);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contacts)
      .values({ ...toRow(parsed.data), lang, createdBy: userId, updatedBy: userId })
      .returning({ id: contacts.id, name: contacts.name });
    await setContactLabels(tx, row.id, wordsOf(parsed.data), userId);
    await audit(tx, { action: "contact.create", userId, entity: "contact", entityId: row.id });
    return row;
  });
  await invalidateTags(tags.contacts);
  return {
    ok: true,
    data: { value: id.id, label: labelOf(id.name, raw, false) },
    message: `${id.name} added`,
  };
}

/**
 * "+ New location" from a quotation (legacy: a customer with no address to load at): a
 * location contact typed in full — the same fields as a location added from a contact's own
 * page. With the customer chosen, it is linked to it as its delivery address, so the next
 * quotation finds it first; without, it is a location contact of its own, to link later.
 */
export async function createDeliveryPlace(
  _p: ActionResult<Place>,
  fd: FormData,
): Promise<ActionResult<Place>> {
  const user = await requirePermission("app.contacts");
  const raw = formToObject(fd);
  if (!raw.contactId) return createLocation(raw, user.id);
  const roleId = await lookupIdByCode(db, "location-roles", DELIVERY_ROLE);
  const made = await linkNew({ ...raw, type: "location", roleId });
  if (!made.ok) return made;
  return {
    ok: true,
    data: { value: made.data.id, label: labelOf(made.data.name, raw, true) },
    message: made.message,
  };
}
