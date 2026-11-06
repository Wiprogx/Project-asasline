"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import type { LookupSelects } from "../queries";
import type { LookupColumn, LookupMeta } from "../meta";

type Errors = Record<string, string[] | undefined> | undefined;

/** One of the list's own columns, as the form asks it: a checkbox, a number, a few words or a pick. */
function ColumnField({
  c,
  id,
  value,
  fe,
  selects,
}: {
  c: LookupColumn;
  id: string;
  value: unknown;
  fe: Errors;
  selects: LookupSelects;
}) {
  if (c.type === "bool")
    return (
      <label className="flex items-center gap-2 text-sm sm:col-span-full">
        <input
          type="checkbox"
          name={c.key}
          defaultChecked={value === true}
          className="size-4 accent-primary"
        />
        {c.label}
      </label>
    );
  const text = value === null || value === undefined ? "" : String(value);
  return (
    <Field id={id} label={c.label} hint={c.hint} error={fe?.[c.key]} required={c.required}>
      {c.type === "int" ? (
        <Input
          id={id}
          name={c.key}
          type="number"
          min={c.min}
          max={c.max}
          step={1}
          defaultValue={text}
          required={c.required}
        />
      ) : c.type === "text" ? (
        <Input
          id={id}
          name={c.key}
          defaultValue={text}
          placeholder={c.placeholder}
          maxLength={c.max}
          required={c.required}
        />
      ) : (
        <NativeSelect
          id={id}
          name={c.key}
          defaultValue={text}
          placeholder={c.placeholder}
          options={selects[c.key] ?? []}
        />
      )}
    </Field>
  );
}

/** A row's words, its place in the list and the list's own columns, as the add form and the edit dialog ask them. */
export function LookupFields({
  prefix,
  fe,
  label,
  position,
  columns,
  selects,
  meta,
}: {
  meta: LookupMeta;
  selects: LookupSelects;
  prefix: string;
  fe: Errors;
  label?: string;
  position?: number;
  /** The row's own columns by key; none for a new row. */
  columns?: Record<string, unknown>;
}) {
  return (
    <>
      <Field
        id={`${prefix}label`}
        label={meta.noun}
        hint={meta.code?.message}
        error={fe?.label}
        required
      >
        <Input
          id={`${prefix}label`}
          name="label"
          defaultValue={label ?? ""}
          placeholder={meta.placeholder}
          className={meta.code ? "font-mono uppercase" : undefined}
          required
          minLength={2}
          maxLength={200}
        />
      </Field>
      {meta.columns?.map((c) => (
        <ColumnField
          key={c.key}
          c={c}
          id={`${prefix}${c.key}`}
          value={columns?.[c.key]}
          fe={fe}
          selects={selects}
        />
      ))}
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
    </>
  );
}
