import "server-only";
import { asc, getTableName, type SQL, sql } from "drizzle-orm";
import type { LookupKind } from "@/domain/lookup-tables";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { lookupFlagColumn, lookupTable } from "@/server/lookups";

/**
 * What uses each list, as the "Used by" column says it: the records' table and the column that
 * points at the row (a join row counts only while live).
 */
const USERS: Record<
  LookupKind,
  readonly (readonly [what: string, table: string, column: string])[]
> = {
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
]);

/** `{ booking: 2, quotation: 5 }` for each row, every name written in full (no ambiguous "id"). */
function usageOf(kind: LookupKind, listTable: string): SQL {
  const parts = USERS[kind].map(([what, table, column]) => {
    const live = REPLACED.has(table) ? ` and "${table}"."archived_at" is null` : "";
    return `'${what}', (select count(*)::int from "${table}" where "${table}"."${column}" = "${listTable}"."id"${live})`;
  });
  return sql.raw(`json_build_object(${parts.join(", ")})`);
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
      flag: sql<boolean>`${lookupFlagColumn(kind) ?? sql`false`}`.mapWith(Boolean),
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
