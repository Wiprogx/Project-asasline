"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { setBookingVessel } from "../actions";

/**
 * The booking's sailing from the register: its ETD, ETA and closings follow the sailing, and
 * move when the sailing moves. Dates typed by hand below are replaced at the next move.
 */
export function BookingSailing({
  bookingId,
  vesselId,
  options,
}: {
  bookingId: string;
  vesselId: string | null;
  options: { value: string; label: string }[];
}) {
  const [, run, pending] = useToastedAction(setBookingVessel);
  return (
    <ActionForm action={run} className="flex flex-wrap items-center gap-2" key={vesselId ?? "none"}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <NativeSelect
        name="vesselId"
        aria-label="Sailing"
        defaultValue={vesselId ?? ""}
        placeholder="No sailing — dates typed by hand"
        options={options}
        className="max-w-xl"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Set sailing
      </Button>
    </ActionForm>
  );
}
