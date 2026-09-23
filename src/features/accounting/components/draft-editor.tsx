"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VAT_CODES } from "@/domain/accounting";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addLine, removeLine } from "../draft-actions";

export function RemoveLine({
  id,
  version,
  lineId,
}: {
  id: string;
  version: number;
  lineId: string;
}) {
  const [, run, pending] = useToastedAction(removeLine);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="lineId" value={lineId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} aria-label="Remove line">
        ✕
      </Button>
    </ActionForm>
  );
}

/** Adds a line to a draft; the VAT code sets the rate and the legal mention. */
export function AddLineForm({
  id,
  version,
  defaultVat,
  accounts,
}: {
  id: string;
  version: number;
  defaultVat: string;
  /** For a supplier bill: where each line is booked (cost accounts). */
  accounts?: { account: string; label: string; default?: boolean }[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useToastedAction(addLine, () => form.current?.reset());
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm
      ref={form}
      action={run}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_5rem_8rem_repeat(2,minmax(10rem,1fr))_auto] lg:items-end"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Field id="l-desc" label="Line" error={fe?.description}>
        <Input id="l-desc" name="description" required />
      </Field>
      <Field id="l-qty" label="Qty" error={fe?.qty}>
        <Input id="l-qty" name="qty" type="number" min={1} defaultValue={1} />
      </Field>
      <Field id="l-unit" label="Unit (EUR)" error={fe?.unit}>
        <Input id="l-unit" name="unit" inputMode="decimal" required />
      </Field>
      {accounts && (
        <Field id="l-account" label="Account">
          <NativeSelect
            id="l-account"
            name="account"
            defaultValue={accounts.find((a) => a.default)?.account}
            options={accounts.map((a) => ({
              value: a.account,
              label: `${a.account} · ${a.label}`,
            }))}
          />
        </Field>
      )}
      <Field id="l-vat" label="VAT">
        <NativeSelect
          id="l-vat"
          name="vatCode"
          defaultValue={defaultVat}
          options={VAT_CODES.map((v) => ({ value: v.code, label: `${v.code} · ${v.label}` }))}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        Add line
      </Button>
    </ActionForm>
  );
}
