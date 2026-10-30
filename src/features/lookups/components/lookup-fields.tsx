"use client";

import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";

type Errors = Record<string, string[] | undefined> | undefined;

/** A row's words, its place in the list and its yes/no, as the add form and the edit dialog ask them. */
export function LookupFields({
  prefix,
  fe,
  label,
  position,
  noun,
  placeholder,
  flag,
  checked,
}: {
  noun: string;
  placeholder: string;
  flag?: { label: string };
  checked?: boolean;
  prefix: string;
  fe: Errors;
  label?: string;
  position?: number;
}) {
  return (
    <>
      <Field id={`${prefix}label`} label={noun} error={fe?.label} required>
        <Input
          id={`${prefix}label`}
          name="label"
          defaultValue={label ?? ""}
          placeholder={placeholder}
          required
          minLength={2}
          maxLength={200}
        />
      </Field>
      <Field
        id={`${prefix}position`}
        label="Order"
        hint="Smaller first; empty puts it at the end."
        error={fe?.position}
      >
        <Input
          id={`${prefix}position`}
          name="position"
          type="number"
          min={0}
          step={1}
          defaultValue={position ?? ""}
        />
      </Field>
      {flag && (
        <label className="flex items-center gap-2 text-sm sm:col-span-full">
          <input
            type="checkbox"
            name="flag"
            defaultChecked={checked}
            className="size-4 accent-primary"
          />
          {flag.label}
        </label>
      )}
    </>
  );
}
