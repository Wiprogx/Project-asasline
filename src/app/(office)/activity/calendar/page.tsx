import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { parseYmd } from "@/domain/dates";
import { monthGrid, shiftMonth } from "@/domain/tasks";
import { NewTaskForm } from "@/features/activity/components/new-task-form";
import { TaskCalendar } from "@/features/activity/components/task-calendar";
import { TaskFilters } from "@/features/activity/components/task-filters";
import { TaskList } from "@/features/activity/components/task-list";
import { staffOptions, tasksBetween } from "@/features/activity/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Calendar" };

const query = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
  day: z
    .string()
    .refine((d) => parseYmd(d) !== null)
    .optional()
    .catch(undefined),
  who: z.string().optional().catch(undefined),
});

export default async function CalendarPage({ searchParams }: PageProps<"/activity/calendar">) {
  const me = await requirePagePermission("app.activity");
  const today = officeToday();
  const q = query.parse(await searchParams);
  const month = q.month ?? (q.day ?? today).slice(0, 7);
  const who = q.who ?? "mine";
  const grid = monthGrid(month).flat();
  const [tasks, staff] = await Promise.all([
    tasksBetween(grid[0].day, grid.at(-1)!.day, who),
    staffOptions(),
  ]);
  const href = (p: Record<string, string>) =>
    `/activity/calendar?${new URLSearchParams({ who, month, ...p })}`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TaskFilters staff={staff} />
        <div className="flex items-center gap-2">
          <Link
            href={href({ month: shiftMonth(month, -1) })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            ‹
          </Link>
          <span className="w-20 text-center font-mono text-sm">{month}</span>
          <Link
            href={href({ month: shiftMonth(month, 1) })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            ›
          </Link>
        </div>
      </div>
      <TaskCalendar
        month={month}
        tasks={tasks}
        today={today}
        selected={q.day}
        hrefFor={(day) => href({ day })}
      />
      {q.day && (
        <section aria-label={`Tasks on ${q.day}`} className="grid gap-3">
          <h2 className="text-sm font-semibold">Tasks on {q.day}</h2>
          <NewTaskForm staff={staff} meId={me.id} defaultDue={q.day} />
          <TaskList
            rows={tasks.filter((t) => t.due === q.day)}
            today={today}
            staff={staff}
            grouped={false}
          />
        </section>
      )}
    </div>
  );
}
