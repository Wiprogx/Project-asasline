import Link from "next/link";
import { type Bucket, bucketOf, monthGrid } from "@/domain/tasks";
import { cn } from "@/lib/utils";
import type { TaskRow } from "../queries";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOT: Record<Bucket, string> = {
  overdue: "bg-destructive",
  today: "bg-warning",
  upcoming: "bg-success",
  undated: "bg-muted-foreground",
};

/** A month of open tasks, Monday first; a day links to its own list below the grid. */
export function TaskCalendar({
  month,
  tasks,
  today,
  selected,
  hrefFor,
}: {
  month: string;
  tasks: TaskRow[];
  today: string;
  selected?: string;
  hrefFor: (day: string) => string;
}) {
  const byDay = new Map<string, TaskRow[]>();
  for (const t of tasks) if (t.due) byDay.set(t.due, [...(byDay.get(t.due) ?? []), t]);

  return (
    <div
      className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm"
      role="grid"
      aria-label={`Tasks in ${month}`}
    >
      {WEEKDAYS.map((d) => (
        <div
          key={d}
          role="columnheader"
          className="bg-card px-2 py-1 text-xs text-muted-foreground"
        >
          {d}
        </div>
      ))}
      {monthGrid(month)
        .flat()
        .map(({ day, inMonth }) => {
          const list = byDay.get(day) ?? [];
          return (
            <Link
              key={day}
              href={hrefFor(day)}
              role="gridcell"
              aria-selected={selected === day}
              aria-label={`${day}: ${list.length} task${list.length === 1 ? "" : "s"}`}
              className={cn(
                "min-h-16 bg-card p-1.5 hover:bg-accent/40 sm:min-h-20",
                !inMonth && "text-muted-foreground",
                selected === day && "ring-2 ring-primary ring-inset",
              )}
            >
              <span className={cn("text-xs", day === today && "font-bold text-primary")}>
                {Number(day.slice(8))}
              </span>
              <span className="mt-1 flex flex-wrap gap-1">
                {list.slice(0, 6).map((t) => (
                  <span
                    key={t.id}
                    className={cn("size-2 rounded-full", DOT[bucketOf(t.due, today)])}
                    title={t.title}
                  />
                ))}
                {list.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">+{list.length - 6}</span>
                )}
              </span>
            </Link>
          );
        })}
    </div>
  );
}
