import Link from "next/link";
import { cn } from "@/lib/utils";

/** One choice of a list's filter nav (a period, a status): a link, marked when it is the one on. */
export function Chip({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      aria-current={on ? "page" : undefined}
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap",
        on ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/** A filter a row's menu added ("Show similar", "Filter out"), taken off with one click. */
export function Taken({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className="inline-flex min-h-6 items-center gap-1 rounded-full border border-primary bg-primary/10 px-2.5 text-xs"
    >
      {children}
      <span aria-hidden="true">✕</span>
      <span className="sr-only">(remove)</span>
    </Link>
  );
}
