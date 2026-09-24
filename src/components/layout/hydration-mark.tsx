"use client";

import { useEffect } from "react";

/**
 * Marks the document once React has hydrated it. A field typed into before that moment can be
 * rewritten by hydration (a textarea got its server text appended to what was typed); the
 * browser suite waits for the mark before it types.
 */
export function HydrationMark() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return null;
}
