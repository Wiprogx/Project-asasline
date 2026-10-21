"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { type PagerKind, pagerKey } from "./pager-source";

/** The list order only changes when another page writes it; this page reads it once. */
const noSubscribe = () => () => {};

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/**
 * "3 / 80 ‹ ›" — the record's place in the list it was opened from, and the next and previous
 * ones; ← and → step through them when no field has the cursor (legacy record pager).
 */
export function RecordPager({ kind, id }: { kind: PagerKind; id: string }) {
  const router = useRouter();
  // The list's order as the tab stored it; nothing on the server, so no mismatch on hydration.
  const raw = useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return sessionStorage.getItem(pagerKey(kind)) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const ids = useMemo<string[]>(() => {
    try {
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, [raw]);
  const at = ids.indexOf(id);
  const prev = at > 0 ? ids[at - 1] : null;
  const next = at >= 0 && at < ids.length - 1 ? ids[at + 1] : null;
  useEffect(() => {
    if (at < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
      if (e.key === "ArrowLeft" && prev) router.push(`/${kind}/${prev}`);
      if (e.key === "ArrowRight" && next) router.push(`/${kind}/${next}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, prev, next, kind, router]);
  if (at < 0 || ids.length < 2) return null;
  const step = (to: string | null, label: string, icon: React.ReactNode) =>
    to ? (
      <Link
        href={`/${kind}/${to}`}
        aria-label={label}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        {icon}
      </Link>
    ) : (
      <span
        aria-hidden="true"
        className="inline-flex size-7 items-center justify-center opacity-30"
      >
        {icon}
      </span>
    );
  return (
    <nav
      aria-label="Record pager"
      className="flex items-center gap-1 text-xs text-muted-foreground"
    >
      {step(prev, "Previous in the list", <ChevronLeftIcon className="size-4" />)}
      <span className="tabular-nums">
        {at + 1} / {ids.length}
      </span>
      {step(next, "Next in the list", <ChevronRightIcon className="size-4" />)}
    </nav>
  );
}
