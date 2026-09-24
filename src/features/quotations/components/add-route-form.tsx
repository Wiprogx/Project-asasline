"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addRoute } from "../route-actions";

/**
 * Another destination on the quotation. An ocean leg of the catalogue brings its ports, box
 * and first lines (the leg and the country's documents); otherwise the ports are typed.
 */
export function AddRouteForm({
  quotationId,
  version,
  lanes,
}: {
  quotationId: string;
  version: number;
  lanes: { value: string; label: string }[];
}) {
  const [state, run, pending] = useToastedAction(addRoute);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm
      action={run}
      className="grid gap-2 sm:grid-cols-[2fr_7rem_7rem_2fr_auto] sm:items-end"
    >
      <input type="hidden" name="quotationId" value={quotationId} />
      <input type="hidden" name="version" value={version} />
      <Field id="ar-lane" label="Ocean leg" error={fe?.laneId}>
        <NativeSelect id="ar-lane" name="laneId" placeholder="— ports typed —" options={lanes} />
      </Field>
      <Field id="ar-pol" label="From" error={fe?.pol}>
        <Input id="ar-pol" name="pol" placeholder="BEANR" />
      </Field>
      <Field id="ar-pod" label="To" error={fe?.pod}>
        <Input id="ar-pod" name="pod" placeholder="CMDLA" />
      </Field>
      <Field id="ar-final" label="Final place (optional)" error={fe?.finalPlace}>
        <Input id="ar-final" name="finalPlace" />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Add destination
      </Button>
    </ActionForm>
  );
}
