import type { ReactNode } from "react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import type { CONTACT_TEXT_FIELDS, ContactFormValues } from "../form-values";

export type TextFieldSpec = readonly [(typeof CONTACT_TEXT_FIELDS)[number], string, string];

/** The form's sections, in order; the jump bar at the top links to each one. */
export const SECTIONS = [
  ["contact-identity", "Identity"],
  ["contact-tax", "VAT & EORI"],
  ["contact-reach", "Reach"],
  ["contact-address", "Address"],
  ["contact-lists", "Professions & tags"],
  ["contact-billing", "Billing"],
] as const;

export function SectionJumps() {
  return (
    <nav aria-label="Form sections" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${id}`} className="text-muted-foreground hover:text-foreground">
          {label}
        </a>
      ))}
    </nav>
  );
}

/** One titled block of the contact form; its id is the jump bar's anchor. */
export function FormSection({
  id,
  children,
}: {
  id: (typeof SECTIONS)[number][0];
  children: ReactNode;
}) {
  const label = SECTIONS.find(([s]) => s === id)?.[1];
  return (
    <fieldset id={id} className="grid scroll-mt-20 gap-4 border-t pt-4">
      <legend className="pr-2 text-sm font-semibold">{label}</legend>
      {children}
    </fieldset>
  );
}

/** A grid of plain text inputs, named and labelled from `fields`. */
export function TextFields({
  fields,
  values,
  errors,
  className = "grid gap-4 sm:grid-cols-2",
  list,
}: {
  fields: readonly TextFieldSpec[];
  values: ContactFormValues;
  errors?: Record<string, string[] | undefined>;
  className?: string;
  /** Datalist ids by field name. */
  list?: Partial<Record<string, string>>;
}) {
  return (
    <div className={className}>
      {fields.map(([name, label, type]) => (
        <Field key={name} id={name} label={label} error={errors?.[name]}>
          <Input
            id={name}
            name={name}
            type={type}
            defaultValue={values[name] ?? ""}
            aria-invalid={!!errors?.[name]}
            list={list?.[name]}
          />
        </Field>
      ))}
    </div>
  );
}
