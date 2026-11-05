"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/shared/field";
import { PlaceSlotProvider } from "@/components/shared/place-slot";
import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";

/**
 * A place of the booking, a contact: the customer's loading address, the line's depot or
 * terminal — one of the places offered for its owner, or made in place with "+ New …"
 * (rendered by the page, it lives with the contacts), linked under the owner and picked at
 * once. The words a booking from before carried are shown until a place is chosen.
 */
export function PlaceField({
  id,
  name = id,
  label,
  hint,
  options,
  ownerId,
  value,
  set,
  made,
  before,
  dialog,
  error,
  className,
}: {
  id: string;
  /** What the form posts the place under; the id unless said. */
  name?: string;
  label: string;
  hint: string;
  options: readonly PickerOption[];
  /** The contact a new place is linked under; none: choose it first. */
  ownerId: string | null;
  value: string | null;
  set: (id: string | null) => void;
  /** A place made from the dialog, kept for the list. */
  made: (p: PickerOption) => void;
  /** What the booking said before a place was chosen for it. */
  before?: string | null;
  dialog?: ReactNode;
  error?: string[];
  className?: string;
}) {
  return (
    <Field
      id={id}
      label={label}
      hint={before && !value ? `${hint} Written before: ${before}.` : hint}
      error={error}
      className={className}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchPicker
            // The owner's default, or a place just made, shows at once.
            key={`${value ?? ""}-${ownerId ?? ""}-${options.length}`}
            id={id}
            name={name}
            options={options}
            defaultValue={value}
            placeholder={ownerId ? `Search ${label.toLowerCase()}…` : "Choose its contact first"}
            empty="No place matches — add a new one."
            onChange={set}
          />
        </div>
        {dialog && (
          <PlaceSlotProvider
            clientId={ownerId}
            onMade={(p) => {
              made(p);
              set(p.value);
            }}
          >
            {dialog}
          </PlaceSlotProvider>
        )}
      </div>
    </Field>
  );
}
