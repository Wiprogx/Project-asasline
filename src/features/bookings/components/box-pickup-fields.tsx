"use client";

import { type ReactNode, useState } from "react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { type LinePlace, placesForLine } from "@/domain/line-places";
import { PlaceField } from "./place-field";

export type BoxPickup = {
  /** Where this empty box is collected: a depot of the line (docs/CONTAINER_FIELDS.md step B). */
  pickupDepotId: string | null;
  pickupDate: string | null;
};

/** Where an empty box may be collected, and what the booking proposes. */
export type PickupPlaces = {
  /** Every depot (domain/line-places), naming the lines it is linked under. */
  depots: readonly LinePlace[];
  /** Every other live location: a depot is not always linked under the line that uses it. */
  locations: readonly LinePlace[];
  /** The booking's shipping line: its depots come first, a new depot is linked under it. */
  lineId: string | null;
  /** The booking's depot — the line's latest, or the one chosen on the booking. */
  proposed: string | null;
  /** "+ New depot", rendered by the page (it lives with the contacts). */
  newDepot?: ReactNode;
};

type Errors = Record<string, string[] | undefined> | undefined;

/**
 * The empty box — this box only (legacy: one truck collects one box). The booking's depot
 * stands in the picker until another is chosen; the day is the box's own, never shared.
 */
export function BoxPickupFields({
  p,
  box,
  places,
  fe,
}: {
  p: string;
  box: BoxPickup;
  places: PickupPlaces;
  fe: Errors;
}) {
  const [depot, setDepot] = useState<string | null>(box.pickupDepotId ?? places.proposed);
  const [made, setMade] = useState<LinePlace[]>([]);
  const under = places.lineId ? [places.lineId] : [];
  return (
    <fieldset className="grid gap-3 rounded-md border p-3 sm:col-span-2 lg:col-span-6 lg:grid-cols-4">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Empty box — this box only
      </legend>
      <PlaceField
        id={`${p}-pickup-depot`}
        name="pickupDepotId"
        label="Collected at (depot)"
        hint="The line's depots first, the booking's proposed; any other place after."
        options={[...made, ...placesForLine(places.depots, places.lineId, places.locations)]}
        ownerId={places.lineId}
        value={depot}
        set={setDepot}
        made={(m) => setMade((ms) => [{ ...m, under }, ...ms])}
        dialog={places.newDepot}
        error={fe?.pickupDepotId}
        className="lg:col-span-3"
      />
      <Field id={`${p}-pickup-date`} label="Collected on" error={fe?.pickupDate}>
        <Input
          id={`${p}-pickup-date`}
          name="pickupDate"
          type="date"
          defaultValue={box.pickupDate ?? ""}
        />
      </Field>
    </fieldset>
  );
}
