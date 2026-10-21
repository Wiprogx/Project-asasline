import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { NewTaskForm } from "@/features/activity/components/new-task-form";
import { TaskList } from "@/features/activity/components/task-list";
import { staffOptions, tasksForContact } from "@/features/activity/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Contact tasks" };

/**
 * A task on the contact itself, and everything to do on its quotations and bookings (legacy
 * cvAct): the general ones first, as the legacy tab put them, then those on a file.
 */
export default async function ContactTasksPage({
  params,
  searchParams,
}: PageProps<"/contacts/[id]/tasks">) {
  const me = await requirePagePermission("app.activity");
  const { id } = await params;
  const { new: fresh } = await searchParams;
  const [rows, staff, types, withdrawReasons] = await Promise.all([
    tasksForContact(id),
    staffOptions(),
    readConfig("activityTypes"),
    readConfig("withdrawReasons"),
  ]);
  const own = (t: (typeof rows)[number]) => t.linkKind === "contact" && t.linkId === id;
  const sections = [
    { key: "own", title: "On the contact itself", rows: rows.filter(own) },
    { key: "files", title: "On its quotations and bookings", rows: rows.filter((t) => !own(t)) },
  ];
  const list = { withdrawReasons, today: officeToday(), staff, grouped: false };
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-4">
          <NewTaskForm
            types={types}
            staff={staff}
            meId={me.id}
            link={{ kind: "contact", id }}
            autoFocus={fresh === "1"}
          />
        </CardContent>
      </Card>
      {sections.map((s) => (
        <section key={s.key} aria-labelledby={`tasks-${s.key}`}>
          <h2 id={`tasks-${s.key}`} className="mb-1 text-sm font-semibold">
            {s.title} ({s.rows.length})
          </h2>
          <TaskList rows={s.rows} {...list} />
        </section>
      ))}
    </div>
  );
}
