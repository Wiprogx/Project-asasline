import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LOG_RANGE_LABEL, LOG_RANGES, type LogRange } from "@/domain/access";
import { APP_LABEL, APPS, hm, IDLE_CUTOFF_SECONDS } from "@/domain/visits";
import { cn } from "@/lib/utils";
import type { timeByApp } from "../time-queries";

type Row = Awaited<ReturnType<typeof timeByApp>>[number];
const SHOWN = APPS.filter((a) => a !== "home");

/** People against apps (legacy Settings › Time): counted only while someone is actually working. */
export function TimeTable({
  rows,
  range,
  window,
}: {
  rows: Row[];
  range: LogRange;
  window: { from: string | null; to: string };
}) {
  const num = "text-right tabular-nums";
  return (
    <div className="grid gap-4">
      <nav aria-label="Range" className="flex flex-wrap items-center gap-1.5 text-sm">
        {LOG_RANGES.map((r) => (
          <Link
            key={r}
            href={`/settings/time?range=${r}`}
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
      <Table aria-label="Time per person and app">
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            {SHOWN.map((a) => (
              <TableHead key={a} className={num}>
                {APP_LABEL[a]}
              </TableHead>
            ))}
            <TableHead className={num}>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              {SHOWN.map((a) => (
                <TableCell key={a} className={cn(num, !r.byApp[a] && "text-muted-foreground/50")}>
                  {r.byApp[a] ? hm(r.byApp[a]) : "—"}
                </TableCell>
              ))}
              <TableCell className={cn(num, "font-semibold")}>
                {r.total ? hm(r.total) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">
        Time is added only while someone is actually working — a gap longer than{" "}
        {IDLE_CUTOFF_SECONDS} seconds is dropped, so a screen left open overnight counts as nothing.
        Each person&apos;s own records are under People › What they did.
      </p>
    </div>
  );
}
