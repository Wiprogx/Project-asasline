import { notFound } from "next/navigation";
import { z } from "zod";
import { SubNav } from "@/components/layout/sub-nav";
import { PageHeader } from "@/components/shared/page-header";
import { can } from "@/domain/permissions";
import { BookingControls } from "@/features/bookings/components/booking-controls";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { getBooking } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";

/** The booking's header, status controls and tabs; each tab is its own URL. */
export default async function BookingLayout({ params, children }: LayoutProps<"/bookings/[id]">) {
  const user = await requirePagePermission("app.bookings");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [b, cancelReasons] = await Promise.all([getBooking(id.data), readConfig("cancelReasons")]);
  if (!b) notFound();

  const base = `/bookings/${b.id}`;
  const editable = can(user.role, "bookings.edit") && b.status !== "cancelled";
  const tabs = [
    { href: base, label: "Summary", exact: true },
    ...(editable ? [{ href: `${base}/edit`, label: "Edit" }] : []),
    { href: `${base}/documents`, label: "Documents" },
    { href: `${base}/containers`, label: `Containers (${b.containers.length})` },
    ...(can(user.role, "app.activity") ? [{ href: `${base}/tasks`, label: "Tasks" }] : []),
    ...(can(user.role, "app.discuss") ? [{ href: `${base}/messages`, label: "Messages" }] : []),
    ...(can(user.role, "app.accounting") ? [{ href: `${base}/billing`, label: "Billing" }] : []),
    { href: `${base}/history`, label: "History" },
  ];

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{b.ref}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={b.status} />
            {b.client.name}
          </span>
        }
        actions={
          <BookingControls
            id={b.id}
            version={b.version}
            status={b.status}
            canEdit={can(user.role, "bookings.edit")}
            canCancel={can(user.role, "bookings.cancel")}
            cancelReasons={cancelReasons}
          />
        }
      />
      <SubNav items={tabs} />
      {children}
    </>
  );
}
