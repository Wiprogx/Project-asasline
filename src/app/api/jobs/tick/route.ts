import { officeToday } from "@/server/clock";
import { escalateWaiting, jobsKeyOk } from "@/server/jobs";

/**
 * The scheduled work, called by the server's cron every few minutes with the JOBS_TOKEN:
 *   curl -X POST -H "Authorization: Bearer $JOBS_TOKEN" https://<host>/api/jobs/tick
 * Without a configured key the endpoint does not exist.
 */
export async function POST(req: Request) {
  const ok = jobsKeyOk(req.headers.get("authorization"));
  if (ok === null) return new Response(null, { status: 404 });
  if (!ok) return Response.json({ ok: false }, { status: 401 });
  const escalated = await escalateWaiting(officeToday());
  return Response.json({ ok: true, escalated });
}
