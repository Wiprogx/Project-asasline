"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES, type Currency, type FxRates, fxOf, fxToInput, isCurrency } from "@/domain/fx";
import { useToastedAction } from "@/hooks/use-action-toast";
import { setCurrency } from "../currency-actions";
import { currencySchema } from "../schemas";

/**
 * A draft's currency and rate (legacy cur / fx): picking USD or GBP proposes the office's rate
 * from Settings › Accounting; the supplier's own rate can be typed over it.
 */
export function CurrencyForm({
  id,
  version,
  currency,
  fxBp,
  rates,
}: {
  id: string;
  version: number;
  currency: string;
  fxBp: number;
  rates: FxRates;
}) {
  const [state, run, pending] = useToastedAction(setCurrency, undefined, currencySchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const [cur, setCur] = useState<Currency>(isCurrency(currency) ? currency : "EUR");
  const [fx, setFx] = useState(fxToInput(fxBp));
  const pick = (c: Currency) => {
    setCur(c);
    setFx(fxToInput(fxOf(rates, c)));
  };
  return (
    <ActionForm action={run} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Field id="doc-cur" label="Currency">
        <NativeSelect
          id="doc-cur"
          name="currency"
          value={cur}
          onChange={(e) => pick(e.target.value as Currency)}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      {cur !== "EUR" && (
        <Field id="doc-fx" label={`Euro for 1 ${cur}`} error={fe?.fx}>
          <Input
            id="doc-fx"
            name="fx"
            inputMode="decimal"
            className="w-28"
            value={fx}
            onChange={(e) => setFx(e.target.value)}
          />
        </Field>
      )}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Set currency
      </Button>
    </ActionForm>
  );
}
