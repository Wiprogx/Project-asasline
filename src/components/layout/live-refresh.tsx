"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-reads the current screen when the office changes something it shows. Listens to the
 * event stream; `match` decides which events matter here. If the stream is unavailable
 * (no Redis), it falls back to a gentle poll so nothing goes stale for long.
 */
export function LiveRefresh({ room, linkId }: { room?: string; linkId?: string }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    let poll: ReturnType<typeof setInterval> | undefined;
    const source = new EventSource("/api/events");
    source.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { room?: string | null; linkId?: string | null };
        if (room && ev.room && ev.room !== room) return;
        if (linkId && ev.linkId !== linkId) return;
        refresh();
      } catch {
        refresh();
      }
    };
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED && !poll) poll = setInterval(refresh, 30_000);
    };
    return () => {
      source.close();
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [router, room, linkId]);
  return null;
}
