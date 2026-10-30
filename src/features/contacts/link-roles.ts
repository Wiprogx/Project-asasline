import "server-only";
import { inArray } from "drizzle-orm";
import type { DbOrTx } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { liveLookupLabel, lookupLabels } from "@/server/lookups";

type RoleKind = "person-roles" | "location-roles";

/** A link's role is a location's when either end is a location, else a person's. */
export const roleKindOf = (a: string, b: string): RoleKind =>
  a === "location" || b === "location" ? "location-roles" : "person-roles";

/** Each contact's type, to know which list a link's role comes from. */
export async function typesOf(tx: DbOrTx, ids: readonly string[]) {
  const rows = await tx
    .select({ id: contacts.id, type: contacts.type })
    .from(contacts)
    .where(inArray(contacts.id, [...ids]));
  return new Map(rows.map((r) => [r.id, r.type as string]));
}

/**
 * The role picked for a link between two contacts of these types: an offered row of the list it
 * belongs to — or the link's own role kept as it was, though no longer offered. Its words, and
 * the link's two role columns (exactly one set); null when it is not a role this link can have.
 */
export async function linkRole(
  tx: DbOrTx,
  types: [string, string],
  roleId: string,
  keep?: string | null,
) {
  const kind = roleKindOf(...types);
  const label =
    (await liveLookupLabel(tx, kind, roleId)) ??
    (keep === roleId ? ((await lookupLabels(kind)).get(roleId) ?? null) : null);
  if (!label) return null;
  const person = kind === "person-roles";
  return {
    label,
    values: { personRoleId: person ? roleId : null, locationRoleId: person ? null : roleId },
  };
}
