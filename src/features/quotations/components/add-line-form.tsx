"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addLine } from "../line-actions";

/**
 * A charge on one destination: an item of the catalogue, priced for this customer (leave the
 * price empty), or a service typed with its own price.
 */
export function AddLineForm({
  quotationId,
  version,
  routeId,
  items,
  showCost,
}: {
  quotationId: string;
  version: number;
  routeId: string;
  items: { value: string; label: string }[];
  showCost: boolean;
}) {
  const [state, run, pending] = useToastedAction(addLine);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const id = (name: string) => `al-${routeId}-${name}`;
  return (
    <ActionForm
      action={run}
      className="grid gap-2 border-t pt-3 sm:grid-cols-[2fr_2fr_5rem_8rem_8rem_auto] sm:items-end"
    >
      <input type="hidden" name="quotationId" value={quotationId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="routeId" value={routeId} />
      <Field id={id("item")} label="From the catalogue" error={fe?.itemId}>
        <NativeSelect id={id("item")} name="itemId" placeholder="— typed below —" options={items} />
      </Field>
      <Field id={id("description")} label="Or a service typed" error={fe?.description}>
        <Input id={id("description")} name="description" placeholder="Extra stop in Mechelen" />
      </Field>
      <Field id={id("qty")} label="Qty" error={fe?.qty}>
        <Input id={id("qty")} name="qty" type="number" min="1" defaultValue="1" />
      </Field>
      <Field id={id("sell")} label="Sell (EUR)" error={fe?.sellCents}>
        <Input id={id("sell")} name="sellCents" type="number" step="0.01" min="0" />
      </Field>
      {showCost ? (
        <Field id={id("cost")} label="Cost (EUR)" error={fe?.costCents}>
          <Input id={id("cost")} name="costCents" type="number" step="0.01" min="0" />
        </Field>
      ) : (
        <span />
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        Add line
      </Button>
    </ActionForm>
  );
}
