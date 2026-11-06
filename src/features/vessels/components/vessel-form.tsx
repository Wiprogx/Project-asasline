"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { MomentField } from "@/components/shared/moment-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VESSEL_STATUS_META, VESSEL_STATUSES } from "@/domain/vessels";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createVessel, updateVessel } from "../actions";
import { vesselSchema, vesselUpdateSchema } from "../schemas";

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
    | "etdTime"
    | "eta"
    | "etaTime"
    | "atd"
    | "atdTime"
    | "ata"
    | "ataTime",
    string | null
  >
> & { id?: string; version?: number; status?: string };

const TEXT = [
  ["name", "Vessel"],
  ["voyage", "Voyage"],
  ["carrier", "Carrier"],
  ["service", "Service"],
  ["pol", "From (UN/LOCODE)"],
  ["pod", "To (UN/LOCODE)"],
] as const;

/** Each moment of the sailing, a day and an hour as one field (domain/moments). */
const MOMENTS = [
  ["etd", "ETD"],
  ["eta", "ETA"],
  ["atd", "Sailed on"],
  ["ata", "Arrived on"],
] as const;

/** A sailing: new, or changed — a changed one moves every booking on it. */
export function VesselForm({ values }: { values?: Values }) {
  const editing = !!values?.id;
  const [state, run, pending] = useToastedAction(
    editing ? updateVessel : createVessel,
    undefined,
    editing ? vesselUpdateSchema : vesselSchema,
  );
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
      {TEXT.map(([name, label]) => (
        <Field key={name} id={`v-${name}`} label={label} error={fe?.[name]}>
          <Input
            id={`v-${name}`}
            name={name}
            type="text"
            defaultValue={values?.[name] ?? ""}
            required={name === "name" || name === "voyage"}
            list={name === "pol" || name === "pod" ? "ports" : undefined}
          />
        </Field>
      ))}
      {MOMENTS.map(([name, label]) => (
        <MomentField
          key={name}
          id={`v-${name}`}
          label={label}
          date={values?.[name] ?? null}
          time={values?.[`${name}Time`] ?? null}
          dateName={name}
          error={fe?.[name] ?? fe?.[`${name}Time`]}
        />
      ))}
      <Field id="v-imo" label="IMO" error={fe?.imo}>
        <Input id="v-imo" name="imo" type="text" defaultValue={values?.imo ?? ""} />
      </Field>
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
