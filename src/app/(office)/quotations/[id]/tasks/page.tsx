import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { NewTaskForm } from "@/features/activity/components/new-task-form";
import { TaskList } from "@/features/activity/components/task-list";
import { staffOptions, tasksForRecord } from "@/features/activity/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Quotation tasks" };

/** The quotation's tasks (legacy Activities tab): the quotation frames the page, Activity fills it. */
export default async function QuotationTasksPage({ params }: PageProps<"/quotations/[id]/tasks">) {
  const me = await requirePagePermission("app.activity");
  const { id } = await params;
  const [rows, staff, types, withdrawReasons] = await Promise.all([
    tasksForRecord("quotation", id),
    staffOptions(),
    readConfig("activityTypes"),
    readConfig("withdrawReasons"),
  ]);
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-4">
          <NewTaskForm types={types} staff={staff} meId={me.id} link={{ kind: "quotation", id }} />
        </CardContent>
      </Card>
      <TaskList
        withdrawReasons={withdrawReasons}
        rows={rows}
        today={officeToday()}
        staff={staff}
        grouped={false}
      />
    </div>
  );
}
