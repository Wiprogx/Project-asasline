import { BellIcon } from "lucide-react";
import Link from "next/link";
import { type BellCounts, bellOf } from "@/domain/notify";
import { cn } from "@/lib/utils";

const TONE = {
  stop: "bg-destructive text-background",
  today: "bg-warning text-background",
  news: "",
} as const;

/** The bell (legacy NOTIFY_LEVELS "today"): what wants me today, red when a shipment stops. */
export function Bell({ counts }: { counts: BellCounts }) {
  const b = bellOf(counts);
  return (
    <Link
      href="/activity"
      aria-label={b.label}
      title={b.label}
      className="relative inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
    >
      <BellIcon className="size-4" aria-hidden="true" />
      {b.count > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -top-1 -right-1 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold",
            TONE[b.level],
          )}
        >
          {b.count}
        </span>
      )}
    </Link>
  );
}
