import "server-only";
import { asc, desc } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";

/** Staff, active first. The password hash never leaves this query. */
export async function listPeople() {
  await requirePermission("app.settings");
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.active), asc(users.name));
}

export type PersonRow = Awaited<ReturnType<typeof listPeople>>[number];
