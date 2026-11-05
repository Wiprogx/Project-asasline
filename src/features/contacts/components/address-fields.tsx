"use client";

import { useState } from "react";
import { CityPicker } from "@/components/shared/city-picker";
import { CountryPicker } from "@/components/shared/country-picker";
import { Field } from "@/components/shared/field";
import { PostcodeField, postcodesOfCity } from "@/components/shared/postcode-field";
import type { AddressPlace, Country } from "@/domain/countries";
import type { PostcodeOption } from "@/domain/postcodes";
import type { ContactFormValues } from "../form-values";
import type { Errors } from "./contact-field-groups";
import { TextFields, type TextFieldSpec } from "./form-section";

const STREET = [["street", "Street", "text"]] as const satisfies readonly TextFieldSpec[];

type City = { id: string | null; name: string | null; region: string | null };

/**
 * Street, the searchable country, its postcode and its city, picked from the country's lists;
 * all but the postcode required. Each change the person makes carries to the next field: a
 * postcode changed replaces the city with its own; a city changed replaces the postcode with its
 * only code, else clears it and offers its codes; a new country clears both. Loading a saved
 * address changes nothing. `onAddress` is told what decides the language after each change —
 * the country, the postcode, the city's region (Settings › Regional languages).
 */
export function AddressFields({
  values,
  fe,
  prefix = "",
  countries,
  onAddress,
  compact,
}: {
  values: ContactFormValues;
  fe: Errors;
  prefix?: string;
  countries: readonly Country[];
  onAddress?: (place: AddressPlace) => void;
  /** In a dialog: two fields a row, never four. */
  compact?: boolean;
}) {
  const common = { values, errors: fe, prefix, className: "contents" };
  const [country, setCountry] = useState(values.country ?? null);
  // The city shown: the record's, or the one a postcode filled in (a new `n` remounts the picker).
  const [city, setCity] = useState<City & { n: number }>({
    id: values.cityId ?? null,
    name: values.city ?? null,
    region: null,
    n: 0,
  });
  // The postcode likewise: the record's, or the one a city filled in, with the codes it offers.
  const [zip, setZip] = useState({
    value: values.zip ?? "",
    offered: [] as PostcodeOption[],
    n: 0,
  });
  /** What the address now says of its language: the state, with what just changed. */
  const tell = (changed: Partial<AddressPlace>) =>
    onAddress?.({ country, zip: zip.value, region: city.region, ...changed });
  // A city picked by the person replaces the postcode: its only code, else none and its codes offered.
  // The field also answers on blur: only a city that changed moves the postcode.
  const cityPicked = async (id: string | null, region: string | null) => {
    if (id === city.id) return;
    setCity((c) => ({ ...c, id, region }));
    if (!country) return;
    const codes = id ? await postcodesOfCity(country, id) : [];
    const value = codes.length === 1 ? codes[0].code : "";
    setZip((z) => ({ value, offered: codes, n: z.n + 1 }));
    tell({ zip: value, region });
  };
  const cityFilled = (c: City & { id: string }) => {
    if (c.id === city.id) return;
    setCity((was) => ({ ...c, n: was.n + 1 }));
    tell({ region: c.region });
  };
  return (
    <div
      className={
        compact
          ? "grid gap-4 sm:grid-cols-2"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_16rem_8rem_1fr]"
      }
    >
      <TextFields fields={STREET} {...common} required />
      <Field id={`${prefix}country`} label="Country" error={fe?.country} required>
        <CountryPicker
          id={`${prefix}country`}
          name="country"
          countries={countries}
          defaultValue={values.country}
          onChange={(code) => {
            setCountry(code);
            if (code !== country) {
              setCity((c) => ({ id: null, name: null, region: null, n: c.n + 1 }));
              setZip((z) => ({ value: "", offered: [], n: z.n + 1 }));
              tell({ country: code, zip: "", region: null });
            } else tell({ country: code });
          }}
          required
        />
      </Field>
      <Field id={`${prefix}zip`} label="Postcode" error={fe?.zip}>
        <PostcodeField
          key={zip.n}
          id={`${prefix}zip`}
          name="zip"
          country={country}
          cityId={city.id}
          defaultValue={zip.value}
          offered={zip.offered}
          onValue={(value) => {
            setZip((z) => ({ ...z, value }));
            tell({ zip: value });
          }}
          onCity={cityFilled}
        />
      </Field>
      <Field id={`${prefix}cityId`} label="City" error={fe?.cityId} required>
        <CityPicker
          key={city.n}
          id={`${prefix}cityId`}
          name="cityId"
          country={country}
          defaultValue={city.id}
          defaultLabel={city.name}
          onChange={(id, c) => void cityPicked(id, c?.region ?? null)}
          required
        />
      </Field>
    </div>
  );
}
