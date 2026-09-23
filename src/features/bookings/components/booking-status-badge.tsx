import { ToneBadge } from "@/components/shared/tone-badge";
import { BOOKING_STATUS_META, type BookingStatus } from "@/domain/shipments";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  return <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>;
}
