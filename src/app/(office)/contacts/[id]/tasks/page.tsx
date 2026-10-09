import type { Metadata } from "next";
import { TaskList } from "@/features/activity/components/task-list";
import { staffOptions, tasksForContact } from "@/features/activity/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Contact tasks" };

/** Everything to do on the contact's bookings and quotations (legacy contact activities tab). */
export default async function ContactTasksPage({ params }: PageProps<"/contacts/[id]/tasks">) {
  await requirePagePermission("app.activity");
  const { id } = await params;
  const [rows, staff, withdrawReasons] = await Promise.all([
    tasksForContact(id),
    staffOptions(),
    readConfig("withdrawReasons"),
  ]);
  return (
    <TaskList
      withdrawReasons={withdrawReasons}
      rows={rows}
      today={officeToday()}
      staff={staff}
      grouped={false}
    />
  );
}
