"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import { ANCHOR_LABEL, ANCHORS, type DocRule, PARTIES } from "@/domain/rules/engine";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveRule } from "../actions";

const opts = <T extends string>(values: readonly T[], label: (v: T) => string = (v) => v) =>
  values.map((v) => ({ value: v, label: label(v) }));

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}

/** Add or edit one rule. The save re-plans every live booking against the new rule book. */
export function RuleDialog({
  rule,
  index,
  version,
  trigger,
}: {
  rule?: DocRule;
  index: number | "new";
  version: number;
  trigger: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(saveRule, () => setOpen(false));
  const fe = !state.ok ? state.fieldErrors : undefined;
  const r = rule;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={r ? "ghost" : "default"} size="sm" />}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <ActionForm action={run} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{r ? `Rule ${r.code}` : "New document rule"}</DialogTitle>
          </DialogHeader>
          <input type="hidden" name="index" value={index} />
          <input type="hidden" name="version" value={version} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="r-code" label="Code" error={fe?.code} hint="Capitals, e.g. ACID">
              <Input
                id="r-code"
                name="code"
                defaultValue={r?.code}
                required
                className="font-mono uppercase"
              />
            </Field>
            <Field id="r-doc" label="Document" error={fe?.doc}>
              <Input id="r-doc" name="doc" defaultValue={r?.doc} required />
            </Field>
            <Field
              id="r-step"
              label="Step (what the person does)"
              error={fe?.step}
              className="sm:col-span-2"
              hint="{docName} reads as the booking's transport document"
            >
              <Input id="r-step" name="step" defaultValue={r?.step} required />
            </Field>
            <Field
              id="r-country"
              label="Destination country"
              error={fe?.country}
              hint="ISO-2 (GA, EG) or * for every country"
            >
              <Input
                id="r-country"
                name="country"
                defaultValue={r?.country ?? "*"}
                className="font-mono uppercase"
              />
            </Field>
            <Field
              id="r-pol"
              label="Loading port"
              error={fe?.pol}
              hint="UN/LOCODE (NLRTM) or * for every port"
            >
              <Input
                id="r-pol"
                name="pol"
                defaultValue={r?.pol ?? "*"}
                className="font-mono uppercase"
              />
            </Field>
            <Field id="r-kind" label="Direction">
              <NativeSelect
                id="r-kind"
                name="kind"
                defaultValue={r?.kind ?? "export"}
                options={[
                  { value: "export", label: "Export" },
                  { value: "import", label: "Import" },
                  { value: "*", label: "Both" },
                ]}
              />
            </Field>
            <Field id="r-party" label="Owed by">
              <NativeSelect
                id="r-party"
                name="party"
                defaultValue={r?.party ?? "customer"}
                options={opts(PARTIES)}
              />
            </Field>
            <Field id="r-role" label="Chased by (role)">
              <NativeSelect
                id="r-role"
                name="role"
                defaultValue={r?.role ?? "docs_clerk"}
                options={opts(ROLES, (v) => ROLE_LABEL[v])}
              />
            </Field>
            <Field id="r-anchor" label="Anchor date">
              <NativeSelect
                id="r-anchor"
                name="anchor"
                defaultValue={r?.anchor ?? "etd"}
                options={opts(ANCHORS, (v) => ANCHOR_LABEL[v])}
              />
            </Field>
            <Field
              id="r-offset"
              label="Days from the anchor"
              error={fe?.offset}
              hint="−2 = two days before"
            >
              <Input
                id="r-offset"
                name="offset"
                type="number"
                min={-60}
                max={60}
                defaultValue={r?.offset ?? 0}
              />
            </Field>
            <Field
              id="r-needs"
              label="Needs first (codes)"
              error={fe?.needs}
              hint="Comma-separated, e.g. INVOICE, VGM"
            >
              <Input
                id="r-needs"
                name="needs"
                defaultValue={r?.needs.join(", ")}
                className="font-mono uppercase"
              />
            </Field>
            <Field id="r-note" label="Why (shown to the team)" className="sm:col-span-2">
              <Input id="r-note" name="note" defaultValue={r?.note} />
            </Field>
            <Field
              id="r-sold"
              label="Only if sold"
              className="sm:col-span-2"
              hint="A word (or pattern like vgm|certiweight) a quotation line must contain; empty = always"
            >
              <Input id="r-sold" name="sold" defaultValue={r?.sold} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Check name="workingDays" label="Working days" checked={r?.workingDays ?? false} />
            <Check
              name="blocking"
              label="⛔ Stops the shipment if missed"
              checked={r?.blocking ?? false}
            />
            <Check name="active" label="Active" checked={r?.active ?? true} />
          </div>
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save rule"}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
