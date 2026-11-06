import "server-only";
import { and, asc, eq, getTableName, isNull, type SQL, sql } from "drizzle-orm";
import { type LookupKind, PROFESSION_CODES } from "@/domain/lookup-tables";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { contactProfessions, contacts, professions } from "@/server/db/schema";
import { lookupColumns, lookupTable } from "@/server/lookups";

/**
 * What uses each list, as the "Used by" column says it: the records' table and the column that
 * points at the row (a join row counts only while live). A box names its owner by its number's
 * first four letters, not by a key: `prefix` matches the row's words against them.
 */
type User = readonly [what: string, table: string, column: string, how?: "prefix"];
const USERS: Record<LookupKind, readonly User[]> = {
  "cancel-reasons": [
    ["quotation", "quotations", "cancel_reason_id"],
    ["booking", "bookings", "cancel_reason_id"],
  ],
  "withdraw-reasons": [["task", "activities", "withdraw_reason_id"]],
  salutations: [["person", "contacts", "salutation_id"]],
  "doc-types": [
    ["quotation", "quotations", "doc_type_id"],
    ["booking", "bookings", "doc_type_id"],
  ],
  "task-types": [["task", "activities", "type_id"]],
  "package-types": [
    ["box", "containers", "package_type_id"],
    ["HS line", "container_hs_lines", "package_type_id"],
  ],
  "seal-sources": [["seal", "container_seals", "source_id"]],
  "person-roles": [["link", "contact_links", "person_role_id"]],
  "location-roles": [["link", "contact_links", "location_role_id"]],
  "contact-doc-kinds": [["paper", "contact_files", "kind_id"]],
  professions: [["contact", "contact_professions", "profession_id"]],
  "contact-tags": [["contact", "contact_tags", "tag_id"]],
  "container-types": [
    ["box", "containers", "type_id"],
    ["destination", "quotation_routes", "container_type_id"],
    ["catalogue item", "rate_items", "container_type_id"],
  ],
  "box-owners": [["box", "containers", "number", "prefix"]],
  "port-regions": [["port", "ports", "region_id"]],
};

/** Tables whose rows are replaced on save: an archived row no longer names anything. */
const REPLACED = new Set([
  "container_hs_lines",
  "container_seals",
  "contact_links",
  "contact_files",
  "contact_professions",
  "contact_tags",
  "containers",
]);

/** `{ booking: 2, quotation: 5 }` for each row, every name written in full (no ambiguous "id"). */
function usageOf(kind: LookupKind, listTable: string): SQL {
  const parts = USERS[kind].map(([what, table, column, how]) => {
    const live = REPLACED.has(table) ? ` and "${table}"."archived_at" is null` : "";
    const names =
      how === "prefix"
        ? `upper(left("${table}"."${column}", 4)) = "${listTable}"."label"`
        : `"${table}"."${column}" = "${listTable}"."id"`;
    return `'${what}', (select count(*)::int from "${table}" where ${names}${live})`;
  });
  return sql.raw(`json_build_object(${parts.join(", ")})`);
}

/** The list's own columns as one object by key: `{ "tareKg": 3900, "maxGrossKg": 32500 }`. */
function columnsOf(kind: LookupKind): SQL<Record<string, unknown>> {
  const pairs = Object.entries(lookupColumns(kind)).map(
    ([key, column]) => sql`${sql.raw(`'${key}'`)}, ${column}`,
  );
  return pairs.length
    ? sql<Record<string, unknown>>`json_build_object(${sql.join(pairs, sql`, `)})`
    : sql<Record<string, unknown>>`'{}'::json`;
}

/** Every reason of a table: offered ones first in their order, then the app's, then archived. */
export async function lookupsForEdit(kind: LookupKind) {
  await requirePermission("app.settings");
  const t = lookupTable(kind);
  return db
    .select({
      id: t.id,
      version: t.version,
      label: t.label,
      position: t.position,
      code: t.code,
      columns: columnsOf(kind).mapWith((v: Record<string, unknown>) => v),
      archivedAt: t.archivedAt,
      archivedReason: t.archivedReason,
      usage: usageOf(kind, getTableName(t)).mapWith((v: Record<string, number>) => v),
    })
    .from(t)
    .orderBy(
      sql`${t.archivedAt} is not null`,
      sql`${t.code} is not null`,
      asc(t.position),
      asc(t.label),
    );
}

export type LookupRow = Awaited<ReturnType<typeof lookupsForEdit>>[number];

export type LookupSelects = Record<string, readonly { value: string; label: string }[]>;

/**
 * The rows a list's `select` columns offer: a box owner's shipping line is one of the live
 * company contacts in the carrier's trade (by the profession's code, so renaming it changes
 * nothing). Empty for the other lists.
 */
export async function lookupSelects(kind: LookupKind): Promise<LookupSelects> {
  await requirePermission("app.settings");
  if (kind !== "box-owners") return {};
  const carriers = await db
    .selectDistinct({ value: contacts.id, label: contacts.name })
    .from(contacts)
    .innerJoin(contactProfessions, eq(contactProfessions.contactId, contacts.id))
    .innerJoin(professions, eq(professions.id, contactProfessions.professionId))
    .where(
      and(
        isNull(contacts.archivedAt),
        eq(contacts.type, "company"),
        isNull(contactProfessions.archivedAt),
        eq(professions.code, PROFESSION_CODES.carrier),
      ),
    )
    .orderBy(asc(contacts.name));
  return { carrierId: carriers };
}
