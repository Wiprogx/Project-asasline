import "server-only";
import { and, asc, count, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import type { BookingStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { bookings, containers, contacts } from "@/server/db/schema";

export type BookingRow = {
  id: string;
  ref: string;
  status: BookingStatus;
  kind: "export" | "import" | "both";
  clientName: string;
  pol: string | null;
  pod: string | null;
  loadDate: string | null;
  etd: string | null;
};

export async function listBookings(
  opts: { q?: string; status?: BookingStatus; cancelled?: boolean } = {},
) {
  await requirePermission("app.bookings");
  const q = opts.q?.trim() ?? "";
  const key = `bookings:list:${opts.status ?? "*"}:${!!opts.cancelled}:${q.toLowerCase()}`;
  return cached(key, { ttlSeconds: 30, tags: [tags.bookings] }, async (): Promise<BookingRow[]> => {
    const where: SQL[] = [];
    if (opts.status) where.push(eq(bookings.status, opts.status));
    else if (!opts.cancelled) where.push(ne(bookings.status, "cancelled"));
    if (q) {
      const like = `%${q}%`;
      where.push(
        or(
          ilike(bookings.ref, like),
          ilike(contacts.name, like),
          ilike(bookings.carrierBookingNo, like),
          ilike(bookings.blNo, like),
          ilike(bookings.pod, like),
        )!,
      );
    }
    return db
      .select({
        id: bookings.id,
        ref: bookings.ref,
        status: bookings.status,
        kind: bookings.kind,
        clientName: contacts.name,
        pol: bookings.pol,
        pod: bookings.pod,
        loadDate: bookings.loadDate,
        etd: bookings.etd,
      })
      .from(bookings)
      .innerJoin(contacts, eq(contacts.id, bookings.clientId))
      .where(and(...where))
      .orderBy(desc(bookings.ref))
      .limit(500);
  });
}

export async function getBooking(id: string) {
  await requirePermission("app.bookings");
  return db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: {
      client: { columns: { id: true, name: true, country: true } },
      quotation: { columns: { id: true, ref: true } },
      containers: { orderBy: asc(containers.position) },
    },
  });
}

/** Counts per status for the home dashboard. */
export async function bookingStats() {
  await requirePermission("app.bookings");
  return cached(
    "bookings:stats",
    { ttlSeconds: 60, tags: [tags.bookings, tags.dashboard] },
    async () => {
      const rows = await db
        .select({ status: bookings.status, n: count() })
        .from(bookings)
        .groupBy(bookings.status);
      return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<
        Record<BookingStatus, number>
      >;
    },
  );
}
