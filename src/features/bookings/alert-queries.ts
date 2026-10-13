import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { openAlerts } from "@/domain/alerts";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bookingAlerts, users } from "@/server/db/schema";

/** The booking's open alerts, the most serious first, with who raised each and when. */
export async function bookingAlertsOf(bookingId: string) {
  await requirePermission("app.bookings");
  const rows = await db
    .select({
      id: bookingAlerts.id,
      level: bookingAlerts.level,
      text: bookingAlerts.text,
      createdAt: bookingAlerts.createdAt,
      resolvedAt: bookingAlerts.resolvedAt,
      by: users.name,
    })
    .from(bookingAlerts)
    .leftJoin(users, eq(users.id, bookingAlerts.createdBy))
    .where(and(eq(bookingAlerts.bookingId, bookingId), isNull(bookingAlerts.resolvedAt)))
    .orderBy(desc(bookingAlerts.createdAt));
  return openAlerts(rows).map((a) => ({ ...a, on: officeToday(a.createdAt) }));
}
