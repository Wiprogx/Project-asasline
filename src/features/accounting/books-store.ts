import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { closeProblem, lockProblem } from "@/domain/books";
import { audit } from "@/server/audit";
import type { DbOrTx, Tx } from "@/server/db/client";
import { configTables } from "@/server/db/schema";
import { Refused } from "./invoice-store";

const BOOKS = "books";
const booksSchema = z.object({ closedThrough: z.string().nullable() });

/**
 * The last closed day. Inside a booking transaction the row is read FOR SHARE, so a close
 * running at the same moment waits for it (and it for the close) — never both.
 */
export async function closedThrough(db: DbOrTx, lock?: "share" | "update"): Promise<string | null> {
  const q = db.select().from(configTables).where(eq(configTables.name, BOOKS));
  const [row] = lock === "share" ? await q.for("share") : lock ? await q.for("update") : await q;
  const parsed = row ? booksSchema.safeParse(row.value) : null;
  return parsed?.success ? parsed.data.closedThrough : null;
}

/** Refuses anything dated in a closed period. */
export async function assertOpen(tx: Tx, day: string): Promise<void> {
  const problem = lockProblem(day, await closedThrough(tx, "share"));
  if (problem) throw new Refused(problem);
}

/** Closes the books through a past day; the close only moves forward. */
export async function closeBooks(tx: Tx, through: string, today: string, userId: string) {
  const before = await closedThrough(tx, "update");
  const problem = closeProblem(through, before, today);
  if (problem) throw new Refused(problem);
  const value = { closedThrough: through };
  await tx
    .insert(configTables)
    .values({ name: BOOKS, value, updatedBy: userId })
    .onConflictDoUpdate({
      target: configTables.name,
      set: { value, updatedBy: userId, updatedAt: new Date() },
    });
  await audit(tx, {
    action: "books.close",
    userId,
    entity: "books",
    entityId: BOOKS,
    detail: { from: before, through },
  });
}
