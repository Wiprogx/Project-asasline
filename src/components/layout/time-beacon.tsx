"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { IDLE_CUTOFF_SECONDS } from "@/domain/visits";

const REPORT_EVERY_MS = 20_000;

/**
 * Counts the seconds of real interaction on the current screen (legacy logTime: a gap longer
 * than the idle cut-off is dropped, so a screen left open overnight counts as nothing) and
 * reports them to the server when the screen changes, the tab hides, or every twenty seconds.
 */
export function TimeBeacon() {
  const pathname = usePathname();
  const seconds = useRef(0);
  const last = useRef<number | null>(null);
  const path = useRef(pathname);

  useEffect(() => {
    const flush = (p: string) => {
      const s = Math.round(seconds.current);
      seconds.current = 0;
      if (s <= 0) return;
      const body = JSON.stringify({ path: p, seconds: s });
      if (!navigator.sendBeacon?.("/api/time", new Blob([body], { type: "application/json" })))
        void fetch("/api/time", { method: "POST", body, keepalive: true }).catch(() => undefined);
    };
    const tick = () => {
      const now = Date.now();
      if (last.current !== null) {
        const gap = (now - last.current) / 1000;
        if (gap > 0 && gap < IDLE_CUTOFF_SECONDS) seconds.current += gap;
      }
      last.current = now;
    };
    const hide = () => {
      if (document.visibilityState === "hidden") {
        tick();
        flush(path.current);
        last.current = null;
      }
    };
    if (path.current !== pathname) {
      tick();
      flush(path.current);
      path.current = pathname;
    }
    const events = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, tick, { passive: true });
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    const timer = setInterval(() => {
      tick();
      flush(path.current);
    }, REPORT_EVERY_MS);
    return () => {
      for (const e of events) window.removeEventListener(e, tick);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide);
      clearInterval(timer);
    };
  }, [pathname]);
  return null;
}
