"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { type PostcodeOption, postcodeKey, postcodeLabel } from "@/domain/postcodes";

/** A city's own postcodes (Settings › Countries), for the field to offer once the city is picked. */
export async function postcodesOfCity(country: string, cityId: string) {
  const r = await fetch(`/api/postcodes?country=${country}&city=${cityId}`);
  return r.ok ? ((await r.json()) as PostcodeOption[]) : [];
}

/**
 * The postcode field: as the person types, the country's postcodes that start so (the city's
 * own first) are suggested — "2600 Berchem" — and the one typed or picked fills the city in. A
 * saved postcode leaves the saved city alone; a city picked offers its own codes (`offered`).
 * A country without a list (Settings › Countries) takes any code.
 */
export function PostcodeField({
  id,
  name,
  country,
  cityId,
  defaultValue,
  offered = [],
  onCity,
  onValue,
  ...aria
}: {
  id: string;
  name: string;
  country: string | null;
  /** The city picked, whose codes come first. */
  cityId?: string | null;
  defaultValue?: string | null;
  /** The codes suggested before anything is typed: the city's own, once it is picked. */
  offered?: readonly PostcodeOption[];
  /** Told the city of the postcode typed or picked, when the list knows it. */
  onCity?: (city: { id: string; name: string }) => void;
  /** Told what the field holds as the person types. */
  onValue?: (zip: string) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [typed, setTyped] = useState(defaultValue ?? "");
  const [options, setOptions] = useState<readonly PostcodeOption[]>(offered);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** One city for the code: it is the address's (a code with several places keeps the city chosen). */
  const settle = (value: string, among: readonly PostcodeOption[]) => {
    if (!country) return;
    const hits = among.filter((o) => o.code === postcodeKey(country, value) && o.cityId);
    if (new Set(hits.map((o) => o.cityId)).size === 1 && hits[0].cityId && hits[0].city)
      onCity?.({ id: hits[0].cityId, name: hits[0].city });
  };

  /** The suggestions for what was typed, fetched once the typing pauses. */
  const lookUp = (value: string) => {
    clearTimeout(timer.current);
    const q = value.trim();
    if (!country || q.length < 2) return;
    timer.current = setTimeout(async () => {
      const city = cityId ? `&city=${cityId}` : "";
      const r = await fetch(`/api/postcodes?country=${country}&q=${encodeURIComponent(q)}${city}`);
      const found = r.ok ? ((await r.json()) as PostcodeOption[]) : [];
      setOptions(found);
      settle(q, found);
    }, 150);
  };

  const listId = `${id}-list`;
  return (
    <>
      <Input
        id={id}
        name={name}
        list={listId}
        autoComplete="off"
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value);
          onValue?.(e.target.value);
          lookUp(e.target.value);
        }}
        {...aria}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={`${o.code}-${o.place}`} value={o.code}>
            {o.city && o.city !== o.place ? `${postcodeLabel(o)} · ${o.city}` : postcodeLabel(o)}
          </option>
        ))}
      </datalist>
    </>
  );
}
