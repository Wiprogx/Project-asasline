import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Period, presets } from "@/domain/period";
import { cn } from "@/lib/utils";

/** A period in the address bar: quick picks, or any two dates. A plain GET form — no script needed. */
export function PeriodPicker({
  path,
  period,
  today,
}: {
  path: string;
  period: Period;
  today: string;
}) {
  const href = (p: Period) => `${path}?from=${p.from}&to=${p.to}`;
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <nav aria-label="Period" className="flex flex-wrap gap-1">
        {presets(today).map(({ label, period: p }) => {
          const on = p.from === period.from && p.to === period.to;
          return (
            <Link
              key={label}
              href={href(p)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm",
                on ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <form action={path} className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="period-from">From</Label>
          <Input id="period-from" name="from" type="date" defaultValue={period.from} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="period-to">To</Label>
          <Input id="period-to" name="to" type="date" defaultValue={period.to} />
        </div>
        <Button type="submit" variant="outline">
          Show
        </Button>
      </form>
    </div>
  );
}
