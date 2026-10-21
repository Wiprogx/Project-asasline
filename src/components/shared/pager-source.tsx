"use client";

import { useEffect } from "react";

export type PagerKind = "bookings" | "contacts" | "quotations";

/** The key a list keeps its order under, for the record pager (this tab only). */
export const pagerKey = (kind: PagerKind) => `pager:${kind}`;

/**
 * Remembers the order of the list on screen — filtered, searched, sorted as it is — so a record
 * opened from it can step to the next one (legacy pagerFrom). Kept for this browser tab only.
 */
export function PagerSource({ kind, ids }: { kind: PagerKind; ids: readonly string[] }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(pagerKey(kind), JSON.stringify(ids));
    } catch {
      // Storage refused (private mode): the pager simply does not show.
    }
  }, [kind, ids]);
  return null;
}
