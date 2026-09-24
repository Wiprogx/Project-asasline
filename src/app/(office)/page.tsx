import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { myTaskCounts } from "@/features/activity/queries";
import { AppTiles } from "@/features/home/components/app-tiles";
import { MonthPanel } from "@/features/home/components/month-panel";
import { appTiles, monthPanel } from "@/features/home/queries";
import { requireUser } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { cn } from "@/lib/utils";

function Stat({
  href,
  label,
  value,
  bad,
}: {
  href: string;
  label: string;
  value: number;
  bad?: boolean;
}) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-2">
      <Card size="sm" className="transition-colors hover:bg-accent/40">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle
            className={cn("text-2xl tabular-nums", bad && value > 0 && "text-destructive")}
          >
            {value}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}

/** Home (legacy vHome + bStatsPanel): my tasks, the launcher with its counts, the month's work. */
export default async function HomePage() {
  const user = await requireUser();
  const today = officeToday();
  const [tasks, tiles, month] = await Promise.all([
    can(user.role, "app.activity") ? myTaskCounts(today) : null,
    appTiles(today),
    monthPanel(today),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={`Good day, ${user.name.split(" ")[0]}`}
        description={`Today in Brussels: ${today}`}
      />
      {tasks && (
        <div className="grid grid-cols-2 gap-3 md:max-w-md">
          <Stat href="/activity" label="My tasks overdue" value={tasks.overdue} bad />
          <Stat href="/activity?when=today" label="My tasks due today" value={tasks.today} />
        </div>
      )}
      <AppTiles t={tiles} settings={can(user.role, "app.settings")} />
      {month && <MonthPanel now={month.now} before={month.before} showValue={month.showValue} />}
    </div>
  );
}
