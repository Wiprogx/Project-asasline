import { readSessionUser } from "@/server/auth/session";
import { redis } from "@/server/cache/redis";
import { EVENTS_CHANNEL } from "@/server/events";

/**
 * Server-Sent Events: one stream per open screen, fed by Redis pub/sub. Signed-in staff only;
 * events carry no data, so the stream reveals nothing a permission check would hide.
 */
export async function GET(request: Request) {
  if (!(await readSessionUser())) return new Response("Signed out", { status: 401 });
  const base = redis();
  if (!base) return new Response("Live updates need Redis", { status: 503 });

  const sub = base.duplicate();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(line));
      sub.on("message", (_channel, payload) => send(`data: ${payload}\n\n`));
      await sub.subscribe(EVENTS_CHANNEL);
      send(": connected\n\n");
      const ping = setInterval(() => send(": ping\n\n"), 25_000);
      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        sub.disconnect();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
