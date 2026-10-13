"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

type Def = { key: string; label: string };

/**
 * Ticks bound to one URL parameter (legacy ⚙ "Figures to show" / "Table columns"): a chosen
 * set is a link that can be bookmarked and shared; the defaults leave the URL clean, "none"
 * hides them all. Keys in `fixed` are always shown and not offered.
 */
export function UrlPicks({
  param,
  title,
  defs,
  defaults,
  shown: given,
  fixed = [],
}: {
  param: string;
  title: string;
  defs: readonly Def[];
  defaults: readonly string[];
  shown: readonly string[];
  fixed?: readonly string[];
}) {
  // The ticks change at once; the URL follows (useOptimistic).
  const [shown, setShown] = useOptimistic(given);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const offered = defs.filter((d) => !fixed.includes(d.key));
  const go = (keys: readonly string[]) => {
    const next = new URLSearchParams(params);
    const all = [...fixed, ...keys];
    const same = all.length === defaults.length && defaults.every((k) => all.includes(k));
    if (same) next.delete(param);
    else next.set(param, keys.length ? all.join(",") : fixed.length ? fixed.join(",") : "none");
    const qs = next.toString();
    start(() => {
      setShown(all);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };
  const toggle = (k: string) =>
    go(offered.map((d) => d.key).filter((x) => (x === k ? !shown.includes(k) : shown.includes(x))));
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground">{title}</summary>
      <fieldset
        className="mt-2 grid gap-1 sm:grid-cols-3 lg:grid-cols-4"
        aria-busy={pending}
        aria-label={title}
      >
        {offered.map((d) => (
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
        <button type="button" className="underline" onClick={() => go(offered.map((d) => d.key))}>
          Show all
        </button>
        <button type="button" className="underline" onClick={() => go([])}>
          Hide all
        </button>
        <button
          type="button"
          className="underline"
          onClick={() => go(defaults.filter((k) => !fixed.includes(k)))}
        >
          Reset
        </button>
      </div>
    </details>
  );
}
