import "server-only";
import { and, asc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { portRegions, ports } from "@/server/db/schema";
import { liveLookups } from "@/server/lookups";

/** How many records name the port, as loading or discharge port ("Used by"). */
const usedBy = (table: string) =>
  sql<number>`(select count(*)::int from ${sql.raw(`"${table}"`)} r
    where r.pol_id = ${ports.id} or r.pod_id = ${ports.id})`;

export type PortScope = { q?: string; regionId?: string; archived?: boolean };

/** The ports table as Settings › Ports edits it: by code, live ones unless archived are asked for. */
export async function portsForEdit(scope: PortScope) {
  await requirePermission("app.settings");
  const q = scope.q?.trim();
  return db
    .select({
      id: ports.id,
      version: ports.version,
      code: ports.code,
      name: ports.name,
      country: ports.country,
      regionId: ports.regionId,
      region: portRegions.label,
      kind: ports.kind,
      aliases: ports.aliases,
      latitude: ports.latitude,
      longitude: ports.longitude,
      timezone: ports.timezone,
      preClearance: ports.preClearance,
      notes: ports.notes,
      archivedAt: ports.archivedAt,
      archivedReason: ports.archivedReason,
      quotations: usedBy("quotation_routes"),
      bookings: usedBy("bookings"),
      catalogue: usedBy("rate_items"),
      sailings: usedBy("vessels"),
    })
    .from(ports)
    .leftJoin(portRegions, eq(portRegions.id, ports.regionId))
    .where(
      and(
        scope.archived ? isNotNull(ports.archivedAt) : isNull(ports.archivedAt),
        scope.regionId ? eq(ports.regionId, scope.regionId) : undefined,
        q
          ? or(
              ilike(ports.code, `%${q}%`),
              ilike(ports.name, `%${q}%`),
              sql`exists (select 1 from unnest(${ports.aliases}) a where a ilike ${`%${q}%`})`,
            )
          : undefined,
      ),
    )
    .orderBy(asc(ports.code));
}

export type PortRow = Awaited<ReturnType<typeof portsForEdit>>[number];

/** The regions a port may be filed under (Settings › Lists › Port regions). */
export async function portRegionOptions() {
  await requirePermission("app.settings");
  return liveLookups("port-regions");
}
