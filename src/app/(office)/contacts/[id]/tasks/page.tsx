import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { NewTaskForm } from "@/features/activity/components/new-task-form";
import { TaskList } from "@/features/activity/components/task-list";
import { staffOptions, tasksForContact } from "@/features/activity/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Contact tasks" };

/** A task on the contact itself, and everything to do on its quotations and bookings (legacy cvAct). */
export default async function ContactTasksPage({ params }: PageProps<"/contacts/[id]/tasks">) {
  const me = await requirePagePermission("app.activity");
  const { id } = await params;
  const [rows, staff, types, withdrawReasons] = await Promise.all([
    tasksForContact(id),
    staffOptions(),
    readConfig("activityTypes"),
    readConfig("withdrawReasons"),
  ]);
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-4">
          <NewTaskForm types={types} staff={staff} meId={me.id} link={{ kind: "contact", id }} />
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
