"use client";

import { Field } from "@/components/shared/field";
import { PlacePicker } from "@/components/shared/place-picker";
import { useFieldId } from "./rate-item-ids";
import type { Errors, RateItemValues } from "./rate-item-types";

/**
 * An inland move's point: a city of Settings › Countries, searched as typed and written
 * "Antwerp (BE)". The field posts the city's id under the words' name; a row from before the
 * cities keeps its words until a city is picked.
 */
export function PlaceField({
  name,
  label,
  v,
  fe,
}: {
  name: "fromPlace" | "toPlace";
  label: string;
  v?: RateItemValues;
  fe: Errors;
}) {
  const fid = useFieldId();
  const words = (v?.[name] as string | null | undefined) ?? null;
  const cityId = (v?.[name === "fromPlace" ? "fromCityId" : "toCityId"] as string | null) ?? null;
  return (
    <Field id={fid(name)} label={label} error={fe?.[name]}>
      <PlacePicker
        id={fid(name)}
        name={name}
        defaultValue={cityId ?? words}
        defaultLabel={words}
        placeholder="Search a city: Antwerp, Rumst…"
      />
    </Field>
  );
}
