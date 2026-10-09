import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { NewTaskForm } from "@/features/activity/components/new-task-form";
import { TaskList } from "@/features/activity/components/task-list";
import { staffOptions, tasksForBooking } from "@/features/activity/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Booking tasks" };

/** The route composes two features: the booking frames the page, Activity fills it. */
export default async function BookingTasksPage({ params }: PageProps<"/bookings/[id]/tasks">) {
  const me = await requirePagePermission("app.activity");
  const { id } = await params;
  const [rows, staff] = await Promise.all([tasksForBooking(id), staffOptions()]);
  const [types, withdrawReasons] = await Promise.all([
    readConfig("activityTypes"),
    readConfig("withdrawReasons"),
  ]);
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-4">
          <NewTaskForm types={types} staff={staff} meId={me.id} link={{ kind: "booking", id }} />
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
