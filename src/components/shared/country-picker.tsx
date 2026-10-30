"use client";

import type { ComponentProps } from "react";
import type { Country } from "@/domain/countries";
import { SearchPicker } from "./search-picker";

/**
 * The country select of every module (the Settings › Countries table): "Belgium (BE)", found by
 * its name or its ISO code, posting the code. An archived country is offered only to the record
 * that already has it.
 */
export function CountryPicker({
  countries,
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof SearchPicker>, "options"> & { countries: readonly Country[] }) {
  return (
    <SearchPicker
      {...props}
      options={countries
        .filter((c) => !c.archived || c.code === defaultValue?.toUpperCase())
        .map((c) => ({ value: c.code, label: c.name, code: c.code }))}
      defaultValue={defaultValue?.toUpperCase()}
      placeholder="Search a country or its code"
      empty="No country matches."
    />
  );
}
