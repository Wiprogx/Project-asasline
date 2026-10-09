import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LOG_RANGE_LABEL, LOG_RANGES, type LogRange, personSummary } from "@/domain/access";
import { cn } from "@/lib/utils";
import type { AuditRow } from "../queries";
import { AuditTable } from "./audit-table";

/** A person's window (legacy "What they did"): the range, the figures, the lines. */
export function PersonLog({
  userId,
  range,
  window,
  rows,
}: {
  userId: string;
  range: LogRange;
  window: { from: string | null; to: string };
  rows: (AuditRow & { ref: string | null })[];
}) {
  const f = personSummary(rows);
  const figures: [string, number][] = [
    ["Entries", f.entries],
    ["Bookings touched", f.bookings],
    ["Quotations touched", f.quotations],
    ["Messages sent", f.messages],
    ["Files filed", f.files],
    ["Tasks closed", f.tasksClosed],
    ["Sensitive reads", f.looked],
  ];
  return (
    <div className="grid gap-4">
      <nav aria-label="Range" className="flex flex-wrap items-center gap-1.5 text-sm">
        {LOG_RANGES.map((r) => (
          <Link
            key={r}
            href={`/settings/people/${userId}/log?range=${r}`}
            aria-current={r === range ? "page" : undefined}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs",
              r === range ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
            )}
          >
            {LOG_RANGE_LABEL[r]}
          </Link>
        ))}
        <span className="text-xs text-muted-foreground">
          {window.from ? `${window.from} → ${window.to}` : `everything up to ${window.to}`}
        </span>
      </nav>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Figures">
        {figures.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-4 text-center">
              <dd className="text-xl font-bold tabular-nums">{value}</dd>
              <dt className="text-xs text-muted-foreground">{label}</dt>
            </CardContent>
          </Card>
        ))}
      </dl>
      <AuditTable rows={rows} />
    </div>
  );
}
