import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { ROLE_LABEL } from "@/domain/permissions";
import { type Bucket, BUCKET_META, BUCKETS, bucketOf } from "@/domain/tasks";
import type { TaskRow } from "../queries";
import { TaskActions } from "./task-actions";

type Staff = { id: string; name: string }[];

function Owner({ t }: { t: TaskRow }) {
  if (t.assigneeName) return <>{t.assigneeName}</>;
  return <>{t.role ? `${ROLE_LABEL[t.role]} · anyone` : "nobody"}</>;
}

function TaskItem({ t, today, staff }: { t: TaskRow; today: string; staff: Staff }) {
  const bucket = bucketOf(t.due, today);
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b py-3 last:border-0">
      <div className="grid min-w-0 gap-1">
        <span className="font-medium [overflow-wrap:anywhere]">{t.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {t.state === "open" && (
            <ToneBadge tone={BUCKET_META[bucket].tone}>{t.due ?? "no date"}</ToneBadge>
          )}
          <Owner t={t} />
          {t.linkRef && (
            <Link href={`/bookings/${t.linkId}`} className="font-mono hover:underline">
              {t.linkRef}
            </Link>
          )}
          {t.state === "done" && t.doneByName && <span>done by {t.doneByName}</span>}
          {t.state === "withdrawn" && <span>withdrawn — {t.withdrawReason}</span>}
        </span>
        {t.note && <span className="text-sm text-muted-foreground">{t.note}</span>}
      </div>
      <TaskActions id={t.id} version={t.version} state={t.state} staff={staff} />
    </li>
  );
}

/** Open tasks grouped Overdue · Today · Upcoming · No date; done or withdrawn ones flat. */
export function TaskList({
  rows,
  today,
  staff,
  grouped = true,
}: {
  rows: TaskRow[];
  today: string;
  staff: Staff;
  grouped?: boolean;
}) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">No tasks here.</p>;
  if (!grouped) {
    return (
      <ul>
        {rows.map((t) => (
          <TaskItem key={t.id} t={t} today={today} staff={staff} />
        ))}
      </ul>
    );
  }
  const groups = new Map<Bucket, TaskRow[]>(BUCKETS.map((b) => [b, []]));
  for (const t of rows) groups.get(bucketOf(t.due, today))!.push(t);
  return (
    <div className="grid gap-6">
      {BUCKETS.filter((b) => groups.get(b)!.length).map((b) => (
        <section key={b} aria-labelledby={`bucket-${b}`}>
          <h2 id={`bucket-${b}`} className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <ToneBadge tone={BUCKET_META[b].tone}>{groups.get(b)!.length}</ToneBadge>
            {BUCKET_META[b].label}
          </h2>
          <ul>
            {groups.get(b)!.map((t) => (
              <TaskItem key={t.id} t={t} today={today} staff={staff} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
