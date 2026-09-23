import "server-only";
import { desc } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { accrualRuns } from "@/server/db/schema";
import { accrualCandidates } from "./accrual-store";

/** What would be booked on the day, and the runs already booked. */
export async function accrualsScreen(onDate: string) {
  await requirePermission("app.accounting");
  const [lines, runs] = await Promise.all([
    accrualCandidates(db, onDate),
    db.select().from(accrualRuns).orderBy(desc(accrualRuns.onDate)).limit(24),
  ]);
  return { lines, runs };
}
