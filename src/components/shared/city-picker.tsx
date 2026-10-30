"use client";

import { useEffect, useState } from "react";
import { type CityOption, cityKey, cityLabel } from "@/domain/cities";
import { type PickerOption, SearchPicker } from "./search-picker";

const optionOf = (c: CityOption): PickerOption => ({
  value: c.id,
  label: cityLabel(c),
  keywords: cityKey([c.name, ...c.aliases].join(" ")),
});

/** A country's cities, read once per country while the page is open. */
const loaded = new Map<string, Promise<CityOption[]>>();
function citiesOf(country: string) {
  if (!loaded.has(country))
    loaded.set(
      country,
      fetch(`/api/cities?country=${encodeURIComponent(country)}`).then((r) =>
        r.ok ? (r.json() as Promise<CityOption[]>) : [],
      ),
    );
  return loaded.get(country)!;
}

/**
 * The city field: one of the chosen country's cities (Settings › Countries), picked, never
 * typed — "Bruxelles" finds Brussels, "liege" finds Liège. It posts the city's id; a city
 * missing from the list is added in Settings. Empty until a country is chosen.
 */
export function CityPicker({
  id,
  name,
  country,
  defaultValue,
  defaultLabel,
  ...props
}: {
  id: string;
  name: string;
  country: string | null;
  /** The record's city (its id) and its name, shown while the list loads. */
  defaultValue?: string | null;
  defaultLabel?: string | null;
  required?: boolean;
  /** Told the city picked (its id), null when cleared. */
  onChange?: (id: string | null) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [options, setOptions] = useState<PickerOption[]>([]);
  useEffect(() => {
    let live = true;
    if (country) void citiesOf(country).then((cs) => live && setOptions(cs.map(optionOf)));
    return () => {
      live = false;
    };
  }, [country]);
  const own =
    defaultValue && defaultLabel && !options.some((o) => o.value === defaultValue)
      ? [{ value: defaultValue, label: defaultLabel }]
      : [];
  return (
    <SearchPicker
      {...props}
      // A new country starts the city over.
      key={country ?? ""}
      id={id}
      name={name}
      options={[...own, ...options]}
      defaultValue={defaultValue}
      limit={50}
      placeholder={country ? "Search a city" : "Choose the country first"}
      empty="No city of this country matches — add it in Settings › Countries."
    />
  );
}
