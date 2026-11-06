"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUARTER_HOUR_SECONDS } from "@/domain/moments";
import { CUTOFF_KEYS, CUTOFF_LABEL, type CutoffRules, cutoffTimeKey } from "@/domain/vessels";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveCutoffRules } from "../actions";

/**
 * Each closing's rule (legacy CUTOFF_RULES): so many days before the ETD, at this hour of the
 * day — customs at noon, the port at 22:00. Saving re-dates every booking on a sailing.
 */
export function CutoffForm({ rules, version }: { rules: CutoffRules; version: number }) {
  const [state, run, pending] = useToastedAction(saveCutoffRules);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={run} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" key={version}>
      <input type="hidden" name="version" value={version} />
      {CUTOFF_KEYS.map((k) => (
        <fieldset key={k} className="grid grid-cols-2 gap-2 rounded-md border p-2">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            {CUTOFF_LABEL[k]}
          </legend>
          <Field id={`co-${k}`} label="Days before ETD" error={fe?.[k]}>
            <Input
              id={`co-${k}`}
              name={k}
              type="number"
              min={0}
              max={30}
              defaultValue={rules[k].days}
            />
          </Field>
          <Field id={`co-${k}-time`} label="At" error={fe?.[cutoffTimeKey(k)]}>
            <Input
              id={`co-${k}-time`}
              name={cutoffTimeKey(k)}
              type="time"
              step={QUARTER_HOUR_SECONDS}
              defaultValue={rules[k].time ?? ""}
            />
          </Field>
        </fieldset>
      ))}
      <div className="sm:col-span-full">
        <Button type="submit" variant="outline" disabled={pending}>
          Save closings
        </Button>
      </div>
    </ActionForm>
  );
}
