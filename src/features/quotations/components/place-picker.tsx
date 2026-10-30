"use client";

import { Field } from "@/components/shared/field";
import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";
import type { ReactNode } from "react";
import { PlaceSlotProvider } from "@/components/shared/place-slot";

/** What the destination's places offer, and how a new one is made (shared by its boxes). */
export type PlaceKit = {
  places: readonly PickerOption[];
  clientId: string | null;
  /** The "+ New location" dialog, rendered by the page (it lives with the contacts). */
  newPlace: ReactNode;
  addPlace: (p: PickerOption) => void;
};

/**
 * The loading address: one of the customer's places (its delivery addresses first, the most
 * recent picked by default), or "+ New location" when it has none yet.
 */
export function PlacePicker({
  id,
  label,
  value,
  set,
  kit,
  error,
}: {
  id: string;
  label: string;
  value: string | null;
  set: (id: string | null) => void;
  kit: PlaceKit;
  error?: string[];
}) {
  return (
    <Field id={id} label={label} error={error} required>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchPicker
            // A place made here (or the customer's list arriving) shows at once.
            key={`${value ?? ""}-${kit.places.length}`}
            id={id}
            name={id}
            options={kit.places}
            defaultValue={value}
            placeholder={kit.clientId ? "Search addresses…" : "Choose the customer first"}
            empty="No address of this customer matches — add a new location."
            onChange={set}
          />
        </div>
        <PlaceSlotProvider
          clientId={kit.clientId}
          onMade={(p) => {
            kit.addPlace(p);
            set(p.value);
          }}
        >
          {kit.newPlace}
        </PlaceSlotProvider>
      </div>
    </Field>
  );
}
