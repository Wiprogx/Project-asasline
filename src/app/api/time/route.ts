import { z } from "zod";
import { checkedSeconds } from "@/domain/visits";
import { readSessionUser } from "@/server/auth/session";
import { logTime } from "@/server/time-log";

const report = z.object({ path: z.string().min(1).max(300), seconds: z.unknown() });

/** The browser's report of a stretch of work (a beacon): signed-in staff only, their own time. */
export async function POST(request: Request) {
  const user = await readSessionUser();
  if (!user) return new Response("Signed out", { status: 401 });
  const parsed = report.safeParse(await request.json().catch(() => null));
  const seconds = parsed.success ? checkedSeconds(parsed.data.seconds) : null;
  if (!parsed.success || seconds === null) return new Response("Bad report", { status: 400 });
  await logTime(user.id, parsed.data.path, seconds);
  return new Response(null, { status: 204 });
}
