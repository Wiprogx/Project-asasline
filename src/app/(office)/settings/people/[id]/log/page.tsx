import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { LOG_RANGES, logWindow } from "@/domain/access";
import { PersonLog } from "@/features/audit/components/person-log";
import { PersonTime } from "@/features/audit/components/person-time";
import { personLog } from "@/features/audit/queries";
import { personTime } from "@/features/audit/time-queries";
import { auditAccess } from "@/server/access";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "What they did" };

/** What one person did (legacy Settings › log): opening another person's record is itself recorded. */
export default async function PersonLogPage({
  params,
  searchParams,
}: PageProps<"/settings/people/[id]/log">) {
  const user = await requirePagePermission("audit.view");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const sp = await searchParams;
  const range = LOG_RANGES.find((r) => r === sp.range) ?? "week";
  const window = logWindow(range, officeToday());
  const [log, time] = await Promise.all([personLog(id.data, window), personTime(id.data, window)]);
  if (!log) notFound();
  if (log.person.id !== user.id)
    await auditAccess("people", {
      action: "people.log.view",
      userId: user.id,
      entity: "user",
      entityId: log.person.id,
      detail: { range },
    });
  return (
    <>
      <div className="mb-4">
        <h2 className="font-heading text-base font-medium">What {log.person.name} did</h2>
        <p className="text-sm text-muted-foreground">
          Edits on records, messages, files, tasks and the reads the office records.
        </p>
      </div>
      <div className="grid gap-4">
        <PersonTime time={time} />
        <PersonLog userId={log.person.id} range={range} window={window} rows={log.rows} />
      </div>
    </>
  );
}
