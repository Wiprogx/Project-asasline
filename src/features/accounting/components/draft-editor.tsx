"use client";

import { useRef, useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VAT_CODES } from "@/domain/accounting";
import type { LineOption } from "@/domain/line-items";
import { centsToInput } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addLine, removeLine } from "../draft-actions";
import { addLineSchema, removeLineSchema } from "../schemas";

export function RemoveLine({
  id,
  version,
  lineId,
}: {
  id: string;
  version: number;
  lineId: string;
}) {
  const [, run, pending] = useToastedAction(removeLine, undefined, removeLineSchema);
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

type Draft = { description: string; unit: string; vatCode: string; account: string };

/**
 * Adds a line to a draft; the VAT code sets the rate and the legal mention. An item picked
 * (legacy itemOptions: the catalogue, then the general items) writes the description, the
 * price, the VAT and the account — all of them still editable.
 */
export function AddLineForm({
  id,
  version,
  defaultVat,
  accounts,
  currency = "EUR",
  options = [],
}: {
  id: string;
  version: number;
  defaultVat: string;
  /** For a supplier bill: where each line is booked (cost accounts). */
  accounts?: { account: string; label: string; default?: boolean }[];
  /** The document's currency: the unit price is typed in it. */
  currency?: string;
  /** What the line can be, picked rather than typed. */
  options?: LineOption[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const blank = (): Draft => ({
    description: "",
    unit: "",
    vatCode: defaultVat,
    account: accounts?.find((a) => a.default)?.account ?? (accounts ? "" : "700000"),
  });
  const [line, setLine] = useState<Draft>(blank);
  const [item, setItem] = useState("");
  const reset = () => {
    form.current?.reset();
    setLine(blank());
    setItem("");
  };
  const [state, run, pending] = useToastedAction(addLine, reset, addLineSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const set = (patch: Partial<Draft>) => setLine((l) => ({ ...l, ...patch }));
  const pick = (key: string) => {
    setItem(key);
    const o = options.find((x) => x.key === key);
    if (!o) return;
    set({
      description: o.description,
      unit: o.unitCents ? centsToInput(o.unitCents) : "",
      vatCode: o.vatCode,
      account:
        accounts && !accounts.some((a) => a.account === o.account) ? line.account : o.account,
    });
  };
  return (
    <ActionForm
      ref={form}
      action={run}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_5rem_8rem_repeat(2,minmax(10rem,1fr))_auto] lg:items-end"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      {options.length > 0 && (
        <Field id="l-item" label="Item" className="sm:col-span-2 lg:col-span-full">
          <NativeSelect
            id="l-item"
            value={item}
            onChange={(e) => pick(e.target.value)}
            placeholder="— type it yourself —"
            options={options.map((o) => ({ value: o.key, label: o.label }))}
          />
        </Field>
      )}
      <Field id="l-desc" label="Line" error={fe?.description}>
        <Input
          id="l-desc"
          name="description"
          required
          value={line.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <Field id="l-qty" label="Qty" error={fe?.qty}>
        <Input id="l-qty" name="qty" type="number" min={1} defaultValue={1} />
      </Field>
      <Field id="l-unit" label={`Unit (${currency})`} error={fe?.unit}>
        <Input
          id="l-unit"
          name="unit"
          inputMode="decimal"
          required
          value={line.unit}
          onChange={(e) => set({ unit: e.target.value })}
        />
      </Field>
      {accounts ? (
        <Field id="l-account" label="Account">
          <NativeSelect
            id="l-account"
            name="account"
            value={line.account}
            onChange={(e) => set({ account: e.target.value })}
            options={accounts.map((a) => ({
              value: a.account,
              label: `${a.account} · ${a.label}`,
            }))}
          />
        </Field>
      ) : (
        <input type="hidden" name="account" value={line.account} />
      )}
      <Field id="l-vat" label="VAT">
        <NativeSelect
          id="l-vat"
          name="vatCode"
          value={line.vatCode}
          onChange={(e) => set({ vatCode: e.target.value })}
          options={VAT_CODES.map((v) => ({ value: v.code, label: `${v.code} · ${v.label}` }))}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        Add line
      </Button>
    </ActionForm>
  );
}
