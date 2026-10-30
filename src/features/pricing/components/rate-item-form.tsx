"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { VAT_CODES } from "@/domain/accounting";
import { centsToInput } from "@/domain/money";
import { RATE_CATEGORIES } from "@/domain/pricing";
import { DEFAULT_RATE_SOURCES, type RateSource } from "@/domain/rate-sources";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createRateItem, updateRateItem } from "../item-actions";
import { rateItemSchema, rateItemUpdateSchema } from "../schemas";
import { CategoryFields, TextField } from "./rate-item-category-fields";
import type { RateItemLists, RateItemValues } from "./rate-item-types";

export type { RateItemLists, RateItemValues } from "./rate-item-types";

/**
 * A catalogue item (legacy fItem): its category decides the fields that identify it; then the
 * price, where the rate comes from, its VAT, until when it holds and a note.
 */
export function RateItemForm({
  values,
  lists,
  sources = DEFAULT_RATE_SOURCES,
  onSaved,
}: {
  values?: RateItemValues;
  lists: RateItemLists;
  /** Where a rate comes from (Settings › Rate sources). */
  sources?: readonly RateSource[];
  /** Told once the item is saved (the dialog it sits in closes). */
  onSaved?: () => void;
}) {
  const editing = !!values?.id;
  const [category, setCategory] = useState(values?.category ?? "ocean");
  const [state, run, pending] = useToastedAction(
    editing ? updateRateItem : createRateItem,
    onSaved,
    editing ? rateItemUpdateSchema : rateItemSchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm
      action={run}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
          options={RATE_CATEGORIES.map((c) => ({ value: c.code, label: c.label }))}
        />
      </Field>
      <CategoryFields key={category} category={category} v={values} fe={fe} lists={lists} />
      <TextField
        name="sellCents"
        label="Sell price (€)"
        type="number"
        value={centsToInput(values?.sellCents)}
        fe={fe}
      />
      <TextField
        name="buyCents"
        label="Buy price / cost (€)"
        type="number"
        value={centsToInput(values?.buyCents)}
        fe={fe}
      />
      <Field id="ri-rateType" label="Rate source" error={fe?.rateType}>
        <NativeSelect
          id="ri-rateType"
          name="rateType"
          defaultValue={values?.rateType ?? "contract"}
          options={sources.map((r) => ({ value: r.key, label: r.label }))}
        />
      </Field>
      <Field
        id="ri-vatCode"
        label="VAT"
        hint="The default for every invoice line made from this item."
        error={fe?.vatCode}
      >
        <NativeSelect
          id="ri-vatCode"
          name="vatCode"
          defaultValue={values?.vatCode ?? "EX41"}
          options={VAT_CODES.map((v) => ({ value: v.code, label: v.label }))}
        />
      </Field>
      <TextField
        name="validUntil"
        label="Valid until"
        type="date"
        value={values?.validUntil}
        fe={fe}
      />
      <TextField name="note" label="Notes" value={values?.note} fe={fe} />
      <div className="sm:col-span-full">
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      </div>
    </ActionForm>
  );
}
