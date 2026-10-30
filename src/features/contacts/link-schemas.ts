import { z } from "zod";

/** The kinds of contact added from a contact's page: a person at it, a location it uses. */
export const LINKABLE_TYPES = ["person", "location"] as const;

/** A row of Settings › Lists › Person roles or Location roles (checked in the action). */
const roleId = z.uuid("Pick a role");

/** An existing contact linked under this one, with its role. */
export const linkExistingSchema = z.object({
  contactId: z.uuid(),
  linkedId: z.uuid("Pick a contact from the list"),
  roleId,
});

/** A new person or location made and linked in one go; its fields are checked as a contact's. */
export const linkNewSchema = z.object({
  contactId: z.uuid(),
  type: z.enum(LINKABLE_TYPES),
  roleId,
});

/** A linked contact corrected from the dialog: the link's role and the contact it points at. */
export const editLinkedSchema = z.object({
  contactId: z.uuid(),
  linkId: z.uuid(),
  linkVersion: z.coerce.number().int().positive(),
  linkedId: z.uuid(),
  linkedVersion: z.coerce.number().int().positive(),
  roleId,
});

export const unlinkSchema = z.object({
  contactId: z.uuid(),
  linkId: z.uuid(),
  reason: z.string().trim().min(3, "Say why — it stays on the record").max(500),
});
