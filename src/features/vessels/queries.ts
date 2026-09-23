import "server-only";
import { and, asc, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { addDays } from "@/domain/dates";
import { sailingLabel } from "@/domain/vessels";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, vessels } from "@/server/db/schema";
import { readCutoffRulesForEdit } from "@/server/vessel-config";

const onBoard = sql<number>`(select count(*) from bookings b where b.vessel_id = ${vessels.id}
  and b.status <> 'cancelled' and b.archived_at is null)::int`;

/** The register, soonest sailing first; past ones after a month drop off unless searched. */
export async function listVessels(opts: { q?: string; today: string }) {
  await requirePermission("app.bookings");
  const q = opts.q?.trim();
  return db
    .select({ vessel: vessels, bookings: onBoard })
    .from(vessels)
    .where(
      and(
        isNull(vessels.archivedAt),
        q
          ? or(
              ilike(vessels.name, `%${q}%`),
              ilike(vessels.voyage, `%${q}%`),
              ilike(vessels.carrier, `%${q}%`),
              ilike(vessels.pod, `%${q}%`),
            )
          : or(isNull(vessels.etd), gte(vessels.etd, addDays(opts.today, -30))),
      ),
    )
    .orderBy(asc(vessels.etd), asc(vessels.name))
    .limit(300);
}

export async function getVessel(id: string) {
  await requirePermission("app.bookings");
  const [v] = await db.select().from(vessels).where(eq(vessels.id, id));
  if (!v) return null;
  const on = await db
    .select({ id: bookings.id, ref: bookings.ref, status: bookings.status, client: contacts.name })
    .from(bookings)
    .leftJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(and(eq(bookings.vesselId, id), isNull(bookings.archivedAt)))
    .orderBy(desc(bookings.ref));
  return { vessel: v, bookings: on };
}

/** Sailings to pick for a booking: from a week back, the booking's own route first. */
export async function sailingOptions(
  today: string,
  route: { pol: string | null; pod: string | null },
) {
  await requirePermission("app.bookings");
  const rows = await db
    .select()
    .from(vessels)
    .where(
      and(
        isNull(vessels.archivedAt),
        or(isNull(vessels.etd), gte(vessels.etd, addDays(today, -7))),
      ),
    )
    .orderBy(asc(vessels.etd))
    .limit(200);
  const fits = (v: (typeof rows)[number]) =>
    (!route.pol || v.pol === route.pol) && (!route.pod || v.pod === route.pod) ? 0 : 1;
  return rows
    .sort((a, b) => fits(a) - fits(b))
    .map((v) => ({ value: v.id, label: sailingLabel(v) }));
}

export async function cutoffRulesForEdit() {
  await requirePermission("app.settings");
  return readCutoffRulesForEdit();
}
