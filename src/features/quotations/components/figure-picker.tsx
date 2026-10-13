"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { DEFAULT_FIGURE_KEYS, FIGURE_DEFS, type FigureKey } from "@/domain/quotation-list";

/**
 * Which figures the list shows (legacy "Choose the figures to show"): ticks bound to ?figs=,
 * so a chosen set is a link that can be shared; "none" hides them all.
 */
export function FigurePicker({ shown: given }: { shown: readonly FigureKey[] }) {
  // The ticks change at once; the URL (and the figures) follow (useOptimistic).
  const [shown, setShown] = useOptimistic(given);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const go = (keys: readonly FigureKey[]) => {
    const next = new URLSearchParams(params);
    const same =
      keys.length === DEFAULT_FIGURE_KEYS.length &&
      DEFAULT_FIGURE_KEYS.every((k) => keys.includes(k));
    if (same) next.delete("figs");
    else next.set("figs", keys.length ? keys.join(",") : "none");
    start(() => {
      setShown(keys);
      router.replace(`${pathname}?${next.toString()}`);
    });
  };
  const toggle = (k: FigureKey) =>
    go(
      FIGURE_DEFS.map((d) => d.key).filter((x) =>
        x === k ? !shown.includes(k) : shown.includes(x),
      ),
    );
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground">Choose the figures</summary>
      <fieldset className="mt-2 grid gap-1 sm:grid-cols-3" aria-busy={pending}>
        <legend className="sr-only">Figures to show</legend>
        {FIGURE_DEFS.map((d) => (
          <label key={d.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shown.includes(d.key)}
              onChange={() => toggle(d.key)}
              className="size-4 accent-primary"
            />
            {d.label}
          </label>
        ))}
      </fieldset>
      <div className="mt-2 flex gap-3 text-xs">
        <button
          type="button"
          className="underline"
          onClick={() => go(FIGURE_DEFS.map((d) => d.key))}
        >
          Show all
        </button>
        <button type="button" className="underline" onClick={() => go([])}>
          Hide all
        </button>
        <button type="button" className="underline" onClick={() => go(DEFAULT_FIGURE_KEYS)}>
          Reset
        </button>
      </div>
    </details>
  );
}
