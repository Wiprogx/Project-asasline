import Link from "next/link";
import { type Side, SIDE_LABEL, SIDES } from "@/domain/sides";
import { cn } from "@/lib/utils";

/**
 * Export and import papers of a shipment that goes both ways (legacy "EXPORT Doc." /
 * "IMPORT Doc." tabs), each with what it still lacks. Links, so a side can be bookmarked.
 */
export function SideTabs({
  base,
  side,
  missing,
}: {
  base: string;
  side: Side;
  missing: Record<Side, number>;
}) {
  return (
    <nav aria-label="Side of the shipment" className="flex flex-wrap gap-1.5">
      {SIDES.map((s) => (
        <Link
          key={s}
          href={s === "export" ? base : `${base}?side=${s}`}
          aria-current={side === s ? "page" : undefined}
          className={cn(
            "inline-flex min-h-8 items-center rounded-md border px-3 text-sm",
            side === s ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
          )}
        >
          {SIDE_LABEL[s]}
          {missing[s] > 0 && ` · ${missing[s]} missing`}
        </Link>
      ))}
    </nav>
  );
}
