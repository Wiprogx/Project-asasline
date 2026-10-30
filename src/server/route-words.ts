import "server-only";
import { inArray } from "drizzle-orm";
import { db, type DbOrTx } from "./db/client";
import { contacts } from "./db/schema";
import { withLabel } from "./lookups";
import { withPorts } from "./ports";

type RouteIds = { containerTypeId: string | null; polId: string | null; podId: string | null };
type CarrierId = { carrierId?: string | null };

/** Rows with their carrier contact's name added as `carrier` (a shipping line, a trucker). */
async function withCarrier<T extends CarrierId>(
  rows: readonly T[],
  tx: DbOrTx,
): Promise<(T & { carrier: string | null })[]> {
  const ids = [...new Set(rows.map((r) => r.carrierId).filter((id): id is string => !!id))];
  const named = ids.length
    ? await tx
        .select({ id: contacts.id, name: contacts.name })
        .from(contacts)
        .where(inArray(contacts.id, ids))
    : [];
  const byId = new Map(named.map((c) => [c.id, c.name]));
  return rows.map((r) => ({ ...r, carrier: r.carrierId ? (byId.get(r.carrierId) ?? null) : null }));
}

/**
 * A catalogue item's or a quotation destination's words as the domain reads them: its box code
 * as `containerType`, its ports' codes as `pol` and `pod`, its carrier contact's name as `carrier`.
 */
export async function withRouteWords<T extends RouteIds & CarrierId>(
  rows: readonly T[],
  tx: DbOrTx = db,
) {
  return withCarrier(
    await withPorts(
      await withLabel(rows, "container-types", "containerTypeId", "containerType"),
      tx,
    ),
    tx,
  );
}
