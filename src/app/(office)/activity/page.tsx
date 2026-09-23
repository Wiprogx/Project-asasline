import type { Metadata } from "next";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { CoverCard } from "@/features/activity/components/cover-card";
import { NewTaskForm } from "@/features/activity/components/new-task-form";
import { TaskFilters } from "@/features/activity/components/task-filters";
import { TaskList } from "@/features/activity/components/task-list";
import { coversNow, listTasks, staffOptions } from "@/features/activity/queries";
import { listFilterSchema } from "@/features/activity/schemas";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Activity" };

/** My open tasks by default (legacy "My tasks"), grouped by the traffic light. */
export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const me = await requirePagePermission("app.activity");
  const filters = listFilterSchema.parse(await searchParams);
  const today = officeToday();
  const [rows, staff, covers] = await Promise.all([
    listTasks(filters),
    staffOptions(),
    coversNow(),
  ]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-4">
          <NewTaskForm staff={staff} meId={me.id} />
        </CardContent>
      </Card>
      <CoverCard
        covers={covers}
        staff={staff}
        today={today}
        canManage={can(me.role, "activity.cover")}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TaskFilters staff={staff} />
        <SearchInput placeholder="Search a task or an SB ref…" />
      </div>
      <TaskList rows={rows} today={today} staff={staff} grouped={filters.state === "open"} />
    </div>
  );
}
