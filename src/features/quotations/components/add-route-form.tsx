"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addRoute } from "../route-actions";
import { addRouteSchema } from "../editor-schemas";
import { modeNote, type LoadingMode } from "@/domain/loading";

/**
 * Another destination on the quotation. An ocean leg of the catalogue brings its ports, box
 * and first lines (the leg and the country's documents); otherwise the ports are typed.
 */
export function AddRouteForm({
  quotationId,
  version,
  lanes,
  ports,
  modes,
}: {
  quotationId: string;
  version: number;
  lanes: { value: string; label: string }[];
  ports: readonly PickerOption[];
  modes: readonly LoadingMode[];
}) {
  const [state, run, pending] = useToastedAction(addRoute, undefined, addRouteSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const [mode, setMode] = useState("");
  return (
    <ActionForm action={run} className="grid gap-2 sm:grid-cols-12 sm:items-end">
      <input type="hidden" name="quotationId" value={quotationId} />
      <input type="hidden" name="version" value={version} />
      <Field id="ar-lane" label="Ocean leg" error={fe?.laneId} className="sm:col-span-6">
        <NativeSelect id="ar-lane" name="laneId" placeholder="— ports typed —" options={lanes} />
      </Field>
      {/* The two ports side by side, on a phone too: a route reads from one to the other. */}
      <div className="grid grid-cols-2 gap-2 sm:col-span-6">
        <Field id="ar-pol" label="From" error={fe?.pol}>
          <SearchPicker id="ar-pol" name="pol" placeholder="BEANR" options={ports} free />
        </Field>
        <Field id="ar-pod" label="To" error={fe?.pod}>
          <SearchPicker id="ar-pod" name="pod" placeholder="CMDLA" options={ports} free />
        </Field>
      </div>
      <Field
        id="ar-final"
        label="Final place (optional)"
        error={fe?.finalPlace}
        className="sm:col-span-4"
      >
        <Input id="ar-final" name="finalPlace" />
      </Field>
      <Field id="ar-boxes" label="Containers" error={fe?.boxes} className="sm:col-span-2">
        <Input id="ar-boxes" name="boxes" type="number" min="1" max="50" defaultValue="1" />
      </Field>
      <Field
        id="ar-mode"
        label="Loading mode"
        hint={modeNote(modes, mode)}
        error={fe?.loadingMode}
        className="sm:col-span-4"
      >
        <NativeSelect
          id="ar-mode"
          name="loadingMode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          placeholder="— to agree —"
          options={modes.map((m) => ({ value: m.name, label: m.name }))}
        />
      </Field>
      <Button type="submit" variant="outline" disabled={pending} className="sm:col-span-2">
        Add destination
      </Button>
    </ActionForm>
  );
}
