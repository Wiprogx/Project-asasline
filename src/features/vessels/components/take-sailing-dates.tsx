"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { setBookingVessel } from "../actions";

/** Lifts a date typed over the sailing's: the booking takes the register's dates and closings again. */
export function TakeSailingDates({ bookingId, vesselId }: { bookingId: string; vesselId: string }) {
  const [, run, pending] = useToastedAction(setBookingVessel);
  return (
    <ActionForm action={run} className="inline">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="vesselId" value={vesselId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Taking…" : "Take the sailing's dates"}
      </Button>
    </ActionForm>
  );
}
