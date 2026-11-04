"use client";

import { useEffect, useState } from "react";
import type { PlaceOption } from "@/domain/cities";
import { type PickerOption, SearchPicker } from "./search-picker";

const optionOf = (c: PlaceOption): PickerOption => ({
  value: c.id,
  label: c.name,
  code: c.country,
  keywords: c.keywords,
});

/** The cities some letters name, read once per query while the page is open. */
const found = new Map<string, Promise<PlaceOption[]>>();
function citiesNamed(q: string) {
  if (!found.has(q))
    found.set(
      q,
      fetch(`/api/cities?q=${encodeURIComponent(q)}`).then((r) =>
        r.ok ? (r.json() as Promise<PlaceOption[]>) : [],
      ),
    );
  return found.get(q)!;
}

/**
 * A place field: a city of any country (Settings › Countries), searched as the person types and
 * shown as "Antwerp (BE)" — "anvers" finds it too. It posts the city's id; a record's place
 * from before the cities is offered as it was written, so the record saves unchanged.
 */
export function PlacePicker({
  id,
  name,
  defaultValue,
  defaultLabel,
  placeholder = "Search a city",
  ...props
}: {
  id: string;
  name: string;
  /** The record's city (its id, or its words when it has no city) and the words shown. */
  defaultValue?: string | null;
  defaultLabel?: string | null;
  placeholder?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [options, setOptions] = useState<PickerOption[]>([]);
  useEffect(() => {
    // A place picked reads "Antwerp (BE)": the search is for the city, not the code.
    const q = typed.replace(/\s*\([A-Za-z]{2}\)\s*$/, "").trim();
    if (q.length < 2) return;
    let live = true;
    const t = setTimeout(
      () => void citiesNamed(q).then((cs) => live && setOptions(cs.map(optionOf))),
      150,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [typed]);
  const own =
    defaultValue && defaultLabel && !options.some((o) => o.value === defaultValue)
      ? [{ value: defaultValue, label: defaultLabel }]
      : [];
  return (
    <SearchPicker
      {...props}
      id={id}
      name={name}
      options={[...own, ...options]}
      defaultValue={defaultValue}
      onTyped={setTyped}
      limit={30}
      placeholder={placeholder}
      empty="No city matches — add it in Settings › Countries."
    />
  );
}
