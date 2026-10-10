import "server-only";
import { sql } from "drizzle-orm";
import { appOf, recordOf } from "@/domain/visits";
import { officeToday } from "./clock";
import { db } from "./db/client";
import { timeLog, visits } from "./db/schema";

/**
 * A stretch of work reported by the browser (legacy logTime + noteVisit): added to the person's
 * day for that app, and to their visit of the record the path is about. Upserts, so a report
 * lost or doubled changes a figure, never a row count.
 */
export async function logTime(userId: string, path: string, seconds: number) {
  const day = officeToday();
  const app = appOf(path);
  await db
    .insert(timeLog)
    .values({ userId, day, app, seconds })
    .onConflictDoUpdate({
      target: [timeLog.userId, timeLog.day, timeLog.app],
      set: { seconds: sql`${timeLog.seconds} + ${seconds}` },
    });
  const record = recordOf(path);
  if (!record) return;
  await db
    .insert(visits)
    .values({ userId, day, kind: record.kind, recordId: record.id, seconds })
    .onConflictDoUpdate({
      target: [visits.userId, visits.day, visits.kind, visits.recordId],
      set: { seconds: sql`${visits.seconds} + ${seconds}`, lastAt: new Date() },
    });
}
