import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/domain/money";
import { cn } from "@/lib/utils";
import type { MonthStats } from "../queries";

type Stat = { key: keyof MonthStats; label: string; money?: boolean; bad?: boolean };

const STATS: Stat[] = [
  { key: "bookings", label: "Bookings" },
  { key: "containers", label: "Containers" },
  { key: "destinations", label: "Destinations" },
  { key: "inTransit", label: "In transit" },
  { key: "arrived", label: "Arrived" },
  { key: "valueCents", label: "Value", money: true },
  { key: "overdueSteps", label: "Overdue steps", bad: true },
];

const delta = (now: number, before: number) =>
  before === 0
    ? now
      ? "new"
      : "—"
    : `${now >= before ? "+" : ""}${Math.round(((now - before) / before) * 100)}%`;

/** The operational month against the last (legacy bStatsPanel), counted by sailing date. */
export function MonthPanel({
  now,
  before,
  showValue,
}: {
  now: MonthStats;
  before: MonthStats;
  showValue: boolean;
}) {
  const shown = STATS.filter((s) => showValue || !s.money);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Bookings · {now.label}
          <span className="ml-2 text-sm font-normal text-muted-foreground">vs {before.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {shown.map((s) => {
            const v = now[s.key] as number;
            const b = before[s.key] as number;
            return (
              <div key={s.key}>
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd
                  className={cn(
                    "text-xl font-semibold tabular-nums",
                    s.bad && v > 0 && "text-destructive",
                  )}
                >
                  {s.money ? formatCents(v) : v}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {delta(v, b)}
                  <span className="sr-only"> against the previous month</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
