"use client";

import type { ComponentProps } from "react";
import type { Country } from "@/domain/countries";
import { SearchPicker } from "./search-picker";

/**
 * The country select of every module (the Settings › Countries table): "Belgium (BE)", found by
 * its name or its ISO code, posting the code. A saved code not in the table is kept.
 */
export function CountryPicker({
  countries,
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof SearchPicker>, "options"> & { countries: readonly Country[] }) {
  return (
    <SearchPicker
      {...props}
      options={countries.map((c) => ({ value: c.code, label: c.name, code: c.code }))}
      defaultValue={defaultValue?.toUpperCase()}
      placeholder="Search a country or its code"
      empty="No country matches."
    />
  );
}
