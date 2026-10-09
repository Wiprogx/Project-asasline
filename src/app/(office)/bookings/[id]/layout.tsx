import { notFound } from "next/navigation";
import { z } from "zod";
import { SubNav } from "@/components/layout/sub-nav";
import { PageHeader } from "@/components/shared/page-header";
import { may } from "@/domain/permissions";
import { BookingControls } from "@/features/bookings/components/booking-controls";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { getBooking } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";
import { releaseState, releaseTone } from "@/domain/release";
import { ToneBadge } from "@/components/shared/tone-badge";
import { readReleaseStates } from "@/server/release-config";
import { creditStanding } from "@/features/accounting/reminder-queries";

/** The booking's header, status controls and tabs; each tab is its own URL. */
export default async function BookingLayout({ params, children }: LayoutProps<"/bookings/[id]">) {
  const user = await requirePagePermission("app.bookings");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [b, cancelReasons, states] = await Promise.all([
    getBooking(id.data),
    readConfig("cancelReasons"),
    readReleaseStates(),
  ]);
  if (!b) notFound();
  const credit = may(user, "app.accounting") ? await creditStanding(b.clientId) : null;

  const base = `/bookings/${b.id}`;
  const editable = may(user, "bookings.edit") && b.status !== "cancelled";
  const tabs = [
    { href: base, label: "Summary", exact: true },
    ...(editable ? [{ href: `${base}/edit`, label: "Edit" }] : []),
    { href: `${base}/documents`, label: "Documents" },
    { href: `${base}/containers`, label: `Containers (${b.containers.length})` },
    { href: `${base}/tracking`, label: "Tracking" },
    ...(may(user, "app.activity") ? [{ href: `${base}/tasks`, label: "Tasks" }] : []),
    ...(may(user, "app.discuss") ? [{ href: `${base}/messages`, label: "Messages" }] : []),
    ...(may(user, "app.accounting") ? [{ href: `${base}/billing`, label: "Billing" }] : []),
    ...(may(user, "costs.view") ? [{ href: `${base}/cost`, label: "Cost & margin" }] : []),
    { href: `${base}/history`, label: "History" },
  ];

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{b.ref}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={b.status} />
            {b.release !== "pending" && (
              <ToneBadge tone={releaseTone(releaseState(states, b.release))}>
                {releaseState(states, b.release).label}
              </ToneBadge>
            )}
            {b.client.name}
            {credit?.problem && <ToneBadge tone="danger">{credit.problem}</ToneBadge>}
          </span>
        }
        actions={
          <BookingControls
            id={b.id}
            version={b.version}
            status={b.status}
            canEdit={may(user, "bookings.edit")}
            canCancel={may(user, "bookings.cancel")}
            cancelReasons={cancelReasons}
          />
        }
      />
      <SubNav items={tabs} />
      {children}
    </>
  );
}
