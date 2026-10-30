import "server-only";
import { asc, desc, sql } from "drizzle-orm";
import { env } from "@/env";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";

// In a single-table select Drizzle drops the table prefix: ${users.id} inside the subquery would
// read as a bare "id" and bind to the sessions table's own id.
const userId = sql.raw(`"users"."id"`);

/** The office's users, active first. The password hash never leaves this query. */
export async function listUsers() {
  await requirePermission("app.settings");
  return db
    .select({
      id: users.id,
      version: users.version,
      name: users.name,
      email: users.email,
      role: users.role,
      jobTitle: users.jobTitle,
      signature: users.signature,
      lang: users.lang,
      active: users.active,
      offReason: users.offReason,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
      /** The day, office time, they last signed in (a session opened): "YYYY-MM-DD". */
      lastSignIn: sql<
        string | null
      >`(select to_char(max(s.created_at) at time zone ${env.APP_TIMEZONE}, 'YYYY-MM-DD') from sessions s where s.user_id = ${userId})`,
    })
    .from(users)
    .orderBy(desc(users.active), asc(users.name));
}

export type UserRow = Awaited<ReturnType<typeof listUsers>>[number];
