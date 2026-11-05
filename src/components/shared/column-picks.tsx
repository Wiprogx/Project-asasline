"use client";

import { Columns3Icon } from "lucide-react";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Def = { key: string; label: string };

/**
 * A "Columns" button that opens the ticks of a table's columns (legacy ⚙ "Table columns"). The
 * choice is the person's own: `onChange` saves it on the server, the ticks move at once.
 */
export function ColumnPicks({
  defs,
  defaults,
  shown: given,
  onChange,
  onReset,
}: {
  defs: readonly Def[];
  defaults: readonly string[];
  shown: readonly string[];
  onChange: (keys: string[]) => Promise<unknown>;
  /** Puts the whole view back (columns and widths); the defaults alone when absent. */
  onReset?: () => Promise<unknown>;
}) {
  const [shown, setShown] = useOptimistic(given);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDetailsElement>(null);
  // A click or a tap outside closes the panel, as a menu would.
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const el = box.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) el.open = false;
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);
  const go = (keys: string[], save: () => Promise<unknown> = () => onChange(keys)) =>
    start(async () => {
      setShown(keys);
      await save();
    });
  const toggle = (k: string) =>
    go(defs.map((d) => d.key).filter((x) => (x === k ? !shown.includes(k) : shown.includes(x))));
  return (
    <details ref={box} className="relative">
      <summary
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <Columns3Icon aria-hidden /> Columns
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border bg-popover p-3 text-sm shadow-md">
        {/* A long list scrolls inside the panel: under a sticky header the page cannot bring it into view. */}
        <fieldset
          className="grid max-h-[50vh] gap-1 overflow-y-auto pr-1"
          aria-busy={pending}
          aria-label="Columns"
        >
          {defs.map((d) => (
            <label key={d.key} className="flex min-h-6 items-center gap-2">
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
          <button type="button" className="underline" onClick={() => go(defs.map((d) => d.key))}>
            Show all
          </button>
          <button type="button" className="underline" onClick={() => go([])}>
            Hide all
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => go([...defaults], onReset ?? (() => onChange([...defaults])))}
          >
            Reset
          </button>
        </div>
      </div>
    </details>
  );
}
