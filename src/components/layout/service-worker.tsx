"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js once the page is up, in the built app only (the layout says which):
 * in development the worker would hide a fresh build behind yesterday's static files.
 */
export function ServiceWorker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No worker, no offline page: the app works exactly as before.
    });
  }, [enabled]);
  return null;
}
