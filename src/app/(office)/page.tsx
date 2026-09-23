import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { BOOKING_FLOW, BOOKING_STATUS_META } from "@/domain/shipments";
import { bookingStats } from "@/features/bookings/queries";
import { requireUser } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export default async function HomePage() {
  const user = await requireUser();
  const stats = can(user.role, "app.bookings") ? await bookingStats() : null;

  return (
    <>
      <PageHeader
        title={`Good day, ${user.name.split(" ")[0]}`}
        description={`Today in Brussels: ${officeToday()}`}
      />
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {BOOKING_FLOW.map((s) => (
            <Link key={s} href={`/bookings?status=${s}`}>
              <Card size="sm" className="transition-colors hover:bg-accent/40">
                <CardHeader>
                  <CardDescription>{BOOKING_STATUS_META[s].label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{stats[s] ?? 0}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Migration in progress</CardTitle>
          <CardDescription>Quotations, Bookings and Contacts run on the new stack.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Activity, Discuss, Accounting and Settings are still served by the legacy app; see
          docs/MIGRATION.md for the order of work.
        </CardContent>
      </Card>
    </>
  );
}
