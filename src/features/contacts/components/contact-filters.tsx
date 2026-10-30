"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type ContactFilter,
  FILTER_FIELDS,
  type FilterField,
  filterLabel,
  filterParam,
} from "@/domain/contact-list";

type Values = { cities: string[]; countries: string[]; tags: string[]; professions: string[] };

const optionsOf = (field: FilterField, v: Values, countryName: Record<string, string>) => {
  if (field === "type")
    return [
      { value: "company", label: "Company" },
      { value: "person", label: "Person" },
      { value: "location", label: "Location" },
    ];
  if (field === "city") return v.cities.map((x) => ({ value: x, label: x }));
  if (field === "country")
    return v.countries.map((x) => ({ value: x, label: countryName[x] ?? x }));
  if (field === "tag") return v.tags.map((x) => ({ value: x, label: x }));
  if (field === "profession") return v.professions.map((x) => ({ value: x, label: x }));
  return null;
};

/**
 * Filters added one by one (legacy "+ Filter"): a field, then a value picked from what the
 * contacts hold or part of the text. Each filter is a chip that takes itself off; all in the
 * URL, so a view can be bookmarked.
 */
export function ContactFilters({
  active,
  values,
  countryName,
}: {
  active: readonly ContactFilter[];
  values: Values;
  countryName: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [field, setField] = useState<FilterField>("city");
  const [value, setValue] = useState("");
  const options = optionsOf(field, values, countryName);
  const hrefWith = (patch: Partial<Record<string, string>>) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const shown = (f: ContactFilter) =>
    f.field === "country"
      ? (countryName[f.value] ?? f.value)
      : f.field === "type"
        ? f.value.charAt(0).toUpperCase() + f.value.slice(1)
        : f.value;
  return (
    <div className="grid gap-2">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) router.replace(hrefWith({ [filterParam(field)]: value.trim() }));
          setValue("");
        }}
      >
        <NativeSelect
          aria-label="Filter on"
          className="w-44"
          value={field}
          onChange={(e) => {
            setField(e.target.value as FilterField);
            setValue("");
          }}
          options={FILTER_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
        />
        {options ? (
          <NativeSelect
            aria-label="Filter value"
            className="w-56"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="— Pick a value —"
            options={options}
          />
        ) : (
          <Input
            aria-label="Filter value"
            className="w-56"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Part of the text"
          />
        )}
        <Button type="submit" size="sm" variant="outline" disabled={!value.trim()}>
          Add filter
        </Button>
      </form>
      {active.length > 0 && (
        <nav aria-label="Filters" className="flex flex-wrap items-center gap-1.5">
          {active.map((f) => (
            <Link
              key={f.field}
              href={hrefWith({ [filterParam(f.field)]: "" })}
              className="inline-flex min-h-6 items-center gap-1 rounded-full border border-primary bg-primary/10 px-2.5 text-xs"
            >
              {filterLabel(f.field)}: {shown(f)}
              <span aria-hidden="true">✕</span>
              <span className="sr-only">(remove)</span>
            </Link>
          ))}
          <Link
            href={hrefWith(Object.fromEntries(active.map((f) => [filterParam(f.field), ""])))}
            className="text-xs underline"
          >
            Clear all
          </Link>
        </nav>
      )}
    </div>
  );
}
