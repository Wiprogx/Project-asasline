import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { BOOKING_FLOW, BOOKING_STATUS_META } from "@/domain/shipments";
import { myTaskCounts } from "@/features/activity/queries";
import { bookingStats } from "@/features/bookings/queries";
import { requireUser } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { cn } from "@/lib/utils";

function Stat({
  href,
  label,
  value,
  className,
}: {
  href: string;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Link href={href}>
      <Card size="sm" className="transition-colors hover:bg-accent/40">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className={cn("text-2xl tabular-nums", className)}>{value}</CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const today = officeToday();
  const [stats, tasks] = await Promise.all([
    can(user.role, "app.bookings") ? bookingStats() : null,
    can(user.role, "app.activity") ? myTaskCounts(today) : null,
  ]);

  return (
    <>
      <PageHeader
        title={`Good day, ${user.name.split(" ")[0]}`}
        description={`Today in Brussels: ${today}`}
      />
      {tasks && (
        <div className="mb-3 grid grid-cols-2 gap-3 md:max-w-md">
          <Stat
            href="/activity"
            label="My tasks overdue"
            value={tasks.overdue}
            className={tasks.overdue ? "text-destructive" : undefined}
          />
          <Stat
            href="/activity"
            label="My tasks due today"
            value={tasks.today}
            className={tasks.today ? "text-warning" : undefined}
          />
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {BOOKING_FLOW.map((s) => (
            <Stat
              key={s}
              href={`/bookings?status=${s}`}
              label={BOOKING_STATUS_META[s].label}
              value={stats[s] ?? 0}
            />
          ))}
        </div>
      )}
      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Migration in progress</CardTitle>
          <CardDescription>
            Activity, Quotations, Bookings, Contacts and Settings run on the new stack.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Discuss and Accounting are still served by the legacy app; see docs/MIGRATION.md for the
          order of work.
        </CardContent>
      </Card>
    </>
  );
}
