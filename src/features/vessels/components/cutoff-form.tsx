"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CUTOFF_KEYS, CUTOFF_LABEL, type CutoffRules } from "@/domain/vessels";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveCutoffRules } from "../actions";

/** Days before the ETD for each closing; saving re-dates every booking on a sailing. */
export function CutoffForm({ rules, version }: { rules: CutoffRules; version: number }) {
  const [state, run, pending] = useToastedAction(saveCutoffRules);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={run} className="grid gap-2 sm:grid-cols-5 sm:items-end" key={version}>
      <input type="hidden" name="version" value={version} />
      {CUTOFF_KEYS.map((k) => (
        <Field key={k} id={`co-${k}`} label={`${CUTOFF_LABEL[k]} (days before)`} error={fe?.[k]}>
          <Input id={`co-${k}`} name={k} type="number" min={0} max={30} defaultValue={rules[k]} />
        </Field>
      ))}
      <Button type="submit" variant="outline" disabled={pending}>
        Save closings
      </Button>
    </ActionForm>
  );
}
