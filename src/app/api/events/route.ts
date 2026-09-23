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
  // The browser leaving can close the stream (cancel) before the request aborts, and a message
  // can arrive in between: every path ends here once, and nothing is written after it.
  let closed = false;
  let ping: ReturnType<typeof setInterval> | undefined;
  const stop = (controller?: ReadableStreamDefaultController) => {
    if (closed) return;
    closed = true;
    clearInterval(ping);
    sub.disconnect();
    try {
      controller?.close();
    } catch {
      // Already closed by the runtime.
    }
  };
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          stop(controller);
        }
      };
      sub.on("message", (_channel, payload) => send(`data: ${payload}\n\n`));
      request.signal.addEventListener("abort", () => stop(controller));
      await sub.subscribe(EVENTS_CHANNEL);
      send(": connected\n\n");
      ping = setInterval(() => send(": ping\n\n"), 25_000);
    },
    cancel() {
      stop();
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
