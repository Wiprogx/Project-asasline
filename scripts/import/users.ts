/** Legacy staff → users, with their bcrypt hash as it is: everyone keeps their password. */
import { sql } from "drizzle-orm";
import { mapLegacyUser } from "../../src/domain/legacy-contacts";
import type { DbOrTx } from "../../src/server/db/client";
import { legacyLinks, users } from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

export async function importUsers(
  tx: DbOrTx,
  rows: readonly Record<string, unknown>[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "users");
  const existing = new Map(
    (await tx.select({ id: users.id, email: sql<string>`lower(${users.email})` }).from(users)).map(
      (u) => [u.email, u.id],
    ),
  );
  for (const row of rows) {
    const u = mapLegacyUser(row);
    if ("error" in u) {
      report.skipped.push(u.error);
      continue;
    }
    const legacyId = String(row.id ?? u.email);
    if (links.has(legacyId)) {
      report.already++;
      continue;
    }
    let id = existing.get(u.email);
    if (id) report.matched++;
    else {
      [{ id }] = await tx.insert(users).values(u).returning({ id: users.id });
      existing.set(u.email, id);
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "users", legacyId, recordId: id });
    links.set(legacyId, id);
  }
  return report;
}
