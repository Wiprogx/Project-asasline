"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { BOOKING_FLOW, BOOKING_STATUS_META, type BookingStatus } from "@/domain/shipments";
import { useToastedAction } from "@/hooks/use-action-toast";
import { cancelBooking, restoreBooking, setBookingStatus } from "../actions";

type Props = {
  id: string;
  version: number;
  status: BookingStatus;
  canEdit: boolean;
  canCancel: boolean;
  cancelReasons: string[];
};

export function BookingControls({ id, version, status, canEdit, canCancel, cancelReasons }: Props) {
  const [, statusAction, statusPending] = useToastedAction(setBookingStatus);
  const [, restoreAction, restorePending] = useToastedAction(restoreBooking);

  if (status === "cancelled") {
    return canCancel ? (
      <ActionForm action={restoreAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <Button type="submit" variant="outline" size="sm" disabled={restorePending}>
          Put back
        </Button>
      </ActionForm>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <ActionForm action={statusAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <NativeSelect
            key={`${status}-${version}`}
            name="status"
            defaultValue={status}
            aria-label="Status"
            className="w-48"
            options={BOOKING_FLOW.map((s) => ({ value: s, label: BOOKING_STATUS_META[s].label }))}
          />
          <Button type="submit" size="sm" disabled={statusPending}>
            Set
          </Button>
        </ActionForm>
      )}
      {canCancel && (
        <ReasonDialog
          action={cancelBooking}
          hidden={{ id, version }}
          trigger="Cancel booking"
          title="Cancel this booking?"
          description="It keeps its number, files and messages and leaves the active lists. Open tasks are withdrawn. You can put it back."
          confirmLabel="Cancel booking"
          reasons={cancelReasons}
        />
      )}
    </div>
  );
}
