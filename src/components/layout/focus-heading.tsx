"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * On a client-side navigation, focus moves to the new page's heading, so a screen reader
 * reads where it landed instead of staying on the link it left (WCAG 2.4.3). The first load
 * is left alone: the browser's own focus start is right there.
 */
export function FocusHeading() {
  const pathname = usePathname();
  // The path this ran for last; the first run only records it (and so does a double-invoked
  // effect in development), so nothing touches the heading before the page has hydrated.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (seen.current === null || seen.current === pathname) {
      seen.current = pathname;
      return;
    }
    seen.current = pathname;
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus();
  }, [pathname]);
  return null;
}
