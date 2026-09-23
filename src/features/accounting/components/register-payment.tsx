"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DIFF_ACCOUNTS, PAYMENT_METHODS } from "@/domain/payments";
import { useToastedAction } from "@/hooks/use-action-toast";
import { registerPayment } from "../payment-actions";

/** Registers a payment on one invoice: the open amount by default, never more. */
export function RegisterPayment({
  invoiceId,
  openCents,
  today,
}: {
  invoiceId: string;
  openCents: number;
  today: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useToastedAction(registerPayment, () => form.current?.reset());
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm
      ref={form}
      action={run}
      className="grid gap-3 sm:grid-cols-[9rem_8rem_8rem_1fr] sm:items-end"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Field id="p-date" label="Date" error={fe?.date}>
        <Input id="p-date" name="date" type="date" defaultValue={today} required />
      </Field>
      <Field id="p-amount" label="Amount (EUR)" error={fe?.amount}>
        <Input
          id="p-amount"
          name="amount"
          inputMode="decimal"
          defaultValue={(openCents / 100).toFixed(2)}
          required
        />
      </Field>
      <Field id="p-method" label="How">
        <NativeSelect
          id="p-method"
          name="method"
          defaultValue="bank"
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
        />
      </Field>
      <Field id="p-ref" label="Reference">
        <Input id="p-ref" name="reference" />
      </Field>
      <Field id="p-writeoff" label="If short, write the rest off to" className="sm:col-span-2">
        <NativeSelect
          id="p-writeoff"
          name="writeOff"
          placeholder="— leave it open —"
          options={Object.entries(DIFF_ACCOUNTS).map(([a, l]) => ({
            value: a,
            label: `${a} · ${l}`,
          }))}
        />
      </Field>
      <div className="sm:col-span-2 sm:self-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Booking…" : "Register payment"}
        </Button>
      </div>
    </ActionForm>
  );
}
