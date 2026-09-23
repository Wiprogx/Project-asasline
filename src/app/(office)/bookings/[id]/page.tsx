import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { can } from "@/domain/permissions";
import { BookingControls } from "@/features/bookings/components/booking-controls";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { BookingSummary } from "@/features/bookings/components/booking-summary";
import { getBooking } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";

export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const user = await requirePagePermission("app.bookings");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [b, cancelReasons] = await Promise.all([getBooking(id.data), readConfig("cancelReasons")]);
  if (!b) notFound();

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{b.ref}</span>}
        description={<BookingStatusBadge status={b.status} />}
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
      <BookingSummary b={b} />
    </>
  );
}
