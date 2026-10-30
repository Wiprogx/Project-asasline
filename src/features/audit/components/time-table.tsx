"use client";

import Link from "next/link";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { LOG_RANGE_LABEL, LOG_RANGES, type LogRange } from "@/domain/access";
import { APP_LABEL, APPS, hm, IDLE_CUTOFF_SECONDS } from "@/domain/visits";
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import { cn } from "@/lib/utils";
import type { timeByApp } from "../time-queries";

type Row = Awaited<ReturnType<typeof timeByApp>>[number];
const SHOWN = APPS.filter((a) => a !== "home");

const SPEC: TableSpec<Row> = {
  search: (r) => [r.name],
  sorts: {
    person: (r) => r.name,
    total: (r) => r.total,
    ...Object.fromEntries(SHOWN.map((a) => [a, (r: Row) => r.byApp[a] ?? 0])),
  },
};

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
  const view = useTableView(rows, SPEC);
  const head = { state: view.state, onSort: view.toggleSort };
  return (
    <div className="grid gap-4">
      <nav aria-label="Range" className="flex flex-wrap items-center gap-1.5 text-sm">
        {LOG_RANGES.map((r) => (
          <Link
            key={r}
            href={`/settings/time?range=${r}`}
            aria-current={r === range ? "page" : undefined}
            className={cn(
              "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs",
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
      <TableToolbar view={view} searchLabel="Search a person" noun="people" one="person" />
      <Table aria-label="Time per person and app">
        <TableHeader>
          <TableRow>
            <SortableHead sortKey="person" {...head}>
              Person
            </SortableHead>
            {SHOWN.map((a) => (
              <SortableHead key={a} sortKey={a} className={num} {...head}>
                {APP_LABEL[a]}
              </SortableHead>
            ))}
            <SortableHead sortKey="total" className={num} {...head}>
              Total
            </SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              {SHOWN.map((a) => (
                <TableCell key={a} className={cn(num, !r.byApp[a] && "text-muted-foreground")}>
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
        Each user&apos;s own records are under Users › What they did.
      </p>
    </div>
  );
}
