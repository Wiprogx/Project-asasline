"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addBookingLeg, removeBookingLeg } from "../leg-actions";

type LegRow = { id: string; name: string; voyage: string; pod: string | null; eta: string | null };

/**
 * The onward legs after the main sailing (legacy legs[]): each connecting vessel in order; the
 * last one's arrival is the booking's. The main sailing above keeps the cut-offs.
 */
export function BookingLegs({
  bookingId,
  legs,
  options,
}: {
  bookingId: string;
  legs: LegRow[];
  options: { value: string; label: string }[];
}) {
  const [, add, adding] = useToastedAction(addBookingLeg);
  const [, remove, removing] = useToastedAction(removeBookingLeg);
  return (
    <div className="grid gap-2 text-sm">
      {legs.length > 0 && (
        <ol className="grid gap-1" aria-label="Onward legs">
          {legs.map((l, i) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Leg {i + 2}</span>
              <span className="font-medium">
                {l.name} · {l.voyage}
              </span>
              <span className="text-muted-foreground">
                → {l.pod ?? "?"}
                {l.eta ? ` · ETA ${l.eta}` : ""}
              </span>
              <ActionForm action={remove} className="inline">
                <input type="hidden" name="bookingId" value={bookingId} />
                <input type="hidden" name="legId" value={l.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={removing}>
                  Take off
                </Button>
              </ActionForm>
            </li>
          ))}
        </ol>
      )}
      <ActionForm action={add} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="bookingId" value={bookingId} />
        <NativeSelect
          name="vesselId"
          aria-label="Connecting sailing"
          placeholder="Connecting sailing…"
          options={options}
          className="max-w-xl"
          required
        />
        <Button type="submit" variant="outline" size="sm" disabled={adding}>
          Add transhipment leg
        </Button>
      </ActionForm>
      <p className="text-xs text-muted-foreground">
        The first sailing sets the cut-offs; the last leg decides the arrival the customer is told.
      </p>
    </div>
  );
}
