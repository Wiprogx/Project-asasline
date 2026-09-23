"use client";

import { useActionState } from "react";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { BOOKING_FLOW, BOOKING_STATUS_META, type BookingStatus } from "@/domain/shipments";
import { useActionToast } from "@/hooks/use-action-toast";
import { IDLE } from "@/lib/action-result";
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
  const [statusState, statusAction, statusPending] = useActionState(setBookingStatus, IDLE);
  const [restoreState, restoreAction, restorePending] = useActionState(restoreBooking, IDLE);
  useActionToast(statusState);
  useActionToast(restoreState);

  if (status === "cancelled") {
    return canCancel ? (
      <form action={restoreAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <Button type="submit" variant="outline" size="sm" disabled={restorePending}>
          Put back
        </Button>
      </form>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <form action={statusAction} className="flex items-center gap-2">
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
        </form>
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
