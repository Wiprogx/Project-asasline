"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centsToInput, formatCents } from "@/domain/money";
import { PAYMENT_METHODS } from "@/domain/payments";
import { useToastedAction } from "@/hooks/use-action-toast";
import { registerSplitPayment } from "../split-payment-actions";

type Open = { id: string; number: string; openCents: number };

/** One transfer over several invoices: what each takes, the open amount offered; empty takes nothing. */
export function SplitPaymentForm({
  customerId,
  invoices,
  today,
}: {
  customerId: string;
  invoices: Open[];
  today: string;
}) {
  const [state, run, pending] = useToastedAction(registerSplitPayment);
  const fe = !state.ok ? state.fieldErrors : undefined;
  if (!invoices.length)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing open for this customer.
      </p>
    );
  return (
    <ActionForm action={run} className="grid gap-4">
      <input type="hidden" name="customerId" value={customerId} />
      <ul className="grid gap-2">
        {invoices.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
            <label htmlFor={`sp-${i.id}`} className="font-mono">
              {i.number}
              <span className="ml-2 font-sans text-xs text-muted-foreground">
                open {formatCents(i.openCents)}
              </span>
            </label>
            <Input
              id={`sp-${i.id}`}
              name={`part.${i.id}`}
              inputMode="decimal"
              placeholder="0.00"
              defaultValue=""
              aria-describedby={`sp-${i.id}-hint`}
              className="w-32"
            />
            <span id={`sp-${i.id}-hint`} className="sr-only">
              Up to {centsToInput(i.openCents)}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="sp-date" label="Date" error={fe?.date}>
          <Input id="sp-date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field id="sp-method" label="How">
          <NativeSelect
            id="sp-method"
            name="method"
            defaultValue="bank"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
          />
        </Field>
        <Field id="sp-ref" label="Reference">
          <Input id="sp-ref" name="reference" />
        </Field>
      </div>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Booking…" : "Book the payment"}
        </Button>
      </div>
    </ActionForm>
  );
}
