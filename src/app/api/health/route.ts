import { sql } from "drizzle-orm";
import { redis } from "@/server/cache/redis";
import { db } from "@/server/db/client";

/** Liveness for the load balancer: the database must answer; Redis is reported, not required. */
export async function GET() {
  let database = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
  } catch {
    // reported below
  }
  const r = redis();
  const cache = r
    ? await r.ping().then(
        () => "up",
        () => "down",
      )
    : "not configured";
  return Response.json(
    { ok: database, database: database ? "up" : "down", cache },
    { status: database ? 200 : 503 },
  );
}
