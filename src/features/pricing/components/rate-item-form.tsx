"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VAT_CODES } from "@/domain/accounting";
import { FREE_KINDS, FREE_SIDES } from "@/domain/pricing";
import { DEFAULT_RATE_SOURCES, type RateSource } from "@/domain/rate-sources";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createRateItem, updateRateItem } from "../item-actions";
import { rateItemSchema, rateItemUpdateSchema } from "../schemas";
import { centsToInput } from "@/domain/money";

type Key =
  | "name"
  | "pol"
  | "pod"
  | "country"
  | "containerType"
  | "carrier"
  | "transitDays"
  | "fromPlace"
  | "toPlace"
  | "docCode"
  | "freeDays";

const LABEL: Record<Key, string> = {
  name: "Name",
  pol: "Port of loading",
  pod: "Port of discharge",
  country: "Country",
  containerType: "Container type",
  carrier: "Carrier",
  transitDays: "Transit (days)",
  fromPlace: "Pickup point",
  toPlace: "Delivery point",
  docCode: "Document code",
  freeDays: "Free days",
};

/** The fields that identify an item of each category (legacy itemCatFields). */
const FIELDS_OF: Record<string, Key[]> = {
  ocean: ["pol", "pod", "country", "containerType", "carrier", "transitDays"],
  inland: ["fromPlace", "toPlace", "containerType", "carrier"],
  docs: ["docCode", "country"],
  freetime: ["name", "freeDays"],
};

export type RateItemValues = Partial<
  Record<Key | "note" | "validUntil", string | number | null>
> & {
  id?: string;
  version?: number;
  category?: string;
  sellCents?: number;
  buyCents?: number;
  vatCode?: string;
  rateType?: string;
  scope?: string | null;
  freeKind?: string | null;
  side?: string | null;
};

/** A catalogue item: its category decides which fields identify it. */
export function RateItemForm({
  categories,
  values,
  sources = DEFAULT_RATE_SOURCES,
}: {
  /** Where a rate comes from (Settings › Rate sources). */
  sources?: readonly RateSource[];
  categories: { code: string; label: string }[];
  values?: RateItemValues;
}) {
  const editing = !!values?.id;
  const [category, setCategory] = useState(values?.category ?? "ocean");
  const [state, run, pending] = useToastedAction(
    editing ? updateRateItem : createRateItem,
    undefined,
    editing ? rateItemUpdateSchema : rateItemSchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  const fields = FIELDS_OF[category] ?? ["name"];
  const input = (name: string, label: string, type = "text", value?: string | number | null) => (
    <Field key={name} id={`ri-${name}`} label={label} error={fe?.[name]}>
      <Input
        id={`ri-${name}`}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={value ?? ""}
        list={name === "pol" || name === "pod" ? "ports" : undefined}
      />
    </Field>
  );
  return (
    <ActionForm
      action={run}
      className="grid gap-2 sm:grid-cols-4 sm:items-end"
      key={editing ? `${values?.id}-${values?.version}` : undefined}
    >
      {editing && (
        <>
          <input type="hidden" name="id" value={values?.id} />
          <input type="hidden" name="version" value={values?.version} />
        </>
      )}
      <Field id="ri-category" label="Category" error={fe?.category}>
        <NativeSelect
          id="ri-category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categories.map((c) => ({ value: c.code, label: c.label }))}
        />
      </Field>
      {fields.map((k) =>
        input(
          k,
          LABEL[k],
          k === "transitDays" || k === "freeDays" ? "number" : "text",
          values?.[k],
        ),
      )}
      {input("sellCents", "Sell (EUR)", "number", centsToInput(values?.sellCents))}
      {input("buyCents", "Buy (EUR)", "number", centsToInput(values?.buyCents))}
      <Field id="ri-vat" label="VAT" error={fe?.vatCode}>
        <NativeSelect
          id="ri-vat"
          name="vatCode"
          defaultValue={values?.vatCode ?? "EX41"}
          options={VAT_CODES.map((v) => ({ value: v.code, label: v.label }))}
        />
      </Field>
      <Field id="ri-rate" label="Rate" error={fe?.rateType}>
        <NativeSelect
          id="ri-rate"
          name="rateType"
          defaultValue={values?.rateType ?? "contract"}
          options={sources.map((r) => ({ value: r.key, label: r.label }))}
        />
      </Field>
      {category === "freetime" && (
        <>
          <Field id="ri-free-kind" label="Free time of" error={fe?.freeKind}>
            <NativeSelect
              id="ri-free-kind"
              name="freeKind"
              defaultValue={values?.freeKind ?? ""}
              placeholder="— by the name —"
              options={FREE_KINDS.map((k) => ({
                value: k,
                label: k[0].toUpperCase() + k.slice(1),
              }))}
            />
          </Field>
          <Field id="ri-side" label="At" error={fe?.side}>
            <NativeSelect
              id="ri-side"
              name="side"
              defaultValue={values?.side ?? ""}
              placeholder="— either end —"
              options={FREE_SIDES.map((k) => ({
                value: k,
                label: k[0].toUpperCase() + k.slice(1),
              }))}
            />
          </Field>
        </>
      )}
      {["customs", "freetime", "vgm", "other"].includes(category) && (
        <Field id="ri-scope" label="Applies to" error={fe?.scope}>
          <NativeSelect
            id="ri-scope"
            name="scope"
            defaultValue={values?.scope ?? ""}
            options={[
              { value: "", label: "Export and import" },
              { value: "export", label: "Export" },
              { value: "import", label: "Import" },
            ]}
          />
        </Field>
      )}
      {input("validUntil", "Valid until", "date", values?.validUntil)}
      {input("note", "Note", "text", values?.note)}
      <Button type="submit" disabled={pending}>
        {editing ? "Save item" : "Add item"}
      </Button>
    </ActionForm>
  );
}
