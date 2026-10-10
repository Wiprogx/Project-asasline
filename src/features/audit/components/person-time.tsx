import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LABEL, type App, hm } from "@/domain/visits";
import type { personTime } from "../time-queries";

type Time = Awaited<ReturnType<typeof personTime>>;

/** A person's time over the window (legacy userSummary.byApp, visitsOf): by app, and on which records. */
export function PersonTime({ time }: { time: Time }) {
  const apps = time.byApp.filter((a) => a.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Time at work · {time.total ? hm(time.total) : "nothing counted"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {apps.length > 0 && (
          <p className="text-muted-foreground">
            {apps.map((a) => `${APP_LABEL[a.app as App] ?? a.app} ${hm(a.seconds)}`).join(" · ")}
          </p>
        )}
        {time.visits.length > 0 ? (
          <ul className="divide-y" aria-label="Time spent on records">
            {time.visits.map((v) => (
              <li
                key={`${v.day}-${v.kind}-${v.href}`}
                className="flex items-center justify-between gap-2 py-1.5"
              >
                <span>
                  <Link className="font-mono underline-offset-2 hover:underline" href={v.href}>
                    {v.label}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {v.kind} · {v.day}
                  </span>
                </span>
                <span className="tabular-nums">{hm(v.seconds)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No stretch of work on a record in this window.</p>
        )}
      </CardContent>
    </Card>
  );
}
