"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VESSEL_STATUS_META, VESSEL_STATUSES } from "@/domain/vessels";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createVessel, updateVessel } from "../actions";

type Values = Partial<
  Record<
    | "name"
    | "voyage"
    | "imo"
    | "carrier"
    | "service"
    | "pol"
    | "pod"
    | "etd"
    | "eta"
    | "atd"
    | "ata",
    string | null
  >
> & { id?: string; version?: number; status?: string };

const FIELDS = [
  ["name", "Vessel", "text"],
  ["voyage", "Voyage", "text"],
  ["carrier", "Carrier", "text"],
  ["service", "Service", "text"],
  ["pol", "From (UN/LOCODE)", "text"],
  ["pod", "To (UN/LOCODE)", "text"],
  ["etd", "ETD", "date"],
  ["eta", "ETA", "date"],
  ["atd", "Sailed on", "date"],
  ["ata", "Arrived on", "date"],
  ["imo", "IMO", "text"],
] as const;

/** A sailing: new, or changed — a changed one moves every booking on it. */
export function VesselForm({ values }: { values?: Values }) {
  const editing = !!values?.id;
  const [state, run, pending] = useToastedAction(editing ? updateVessel : createVessel);
  const fe = !state.ok ? state.fieldErrors : undefined;
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
      {FIELDS.map(([name, label, type]) => (
        <Field key={name} id={`v-${name}`} label={label} error={fe?.[name]}>
          <Input
            id={`v-${name}`}
            name={name}
            type={type}
            defaultValue={values?.[name] ?? ""}
            required={name === "name" || name === "voyage"}
          />
        </Field>
      ))}
      <Field id="v-status" label="State" error={fe?.status}>
        <NativeSelect
          id="v-status"
          name="status"
          defaultValue={values?.status ?? "scheduled"}
          options={VESSEL_STATUSES.map((s) => ({ value: s, label: VESSEL_STATUS_META[s].label }))}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {editing ? "Save sailing" : "Add sailing"}
      </Button>
    </ActionForm>
  );
}
