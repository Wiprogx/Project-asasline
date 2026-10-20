"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** List or cards (legacy view switch: list, kanban); the choice stays in the URL. */
export function ViewSwitch({ cards }: { cards: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (view: string | null) => {
    const next = new URLSearchParams(params);
    if (view) next.set("view", view);
    else next.delete("view");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const item = (label: string, on: boolean, to: string) => (
    <Link
      href={to}
      aria-current={on ? "page" : undefined}
      className={cn(
        "inline-flex min-h-8 items-center rounded-md px-3 text-sm",
        on ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="View" className="flex gap-1 rounded-md border p-0.5">
      {item("List", !cards, href(null))}
      {item("Cards", cards, href("cards"))}
    </nav>
  );
}
