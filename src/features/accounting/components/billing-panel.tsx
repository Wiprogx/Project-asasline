"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { draftFromBooking } from "../draft-actions";

type Line = {
  key: string;
  description: string;
  qty: number;
  unitCents: number;
  vatCode: string;
  remaining: number;
};

/**
 * Invoice a booking line by line: what is left of each line is proposed; lower a quantity or
 * set it to 0 to leave it for a later invoice or another payer.
 */
export function BillingPanel({
  bookingId,
  lines,
  parties,
  defaultPayer,
}: {
  bookingId: string;
  lines: Line[];
  parties: { id: string; name: string }[];
  defaultPayer: string;
}) {
  const [state, run, pending] = useToastedAction(draftFromBooking);
  const open = lines.filter((l) => l.remaining > 0);
  if (lines.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No priced lines: this booking has no quotation to invoice from.
      </p>
    );
  if (open.length === 0)
    return <p className="text-sm text-muted-foreground">Everything on this booking is invoiced.</p>;

  return (
    <ActionForm action={run} className="grid gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Field id="b-payer" label="Invoice to (a party on the booking)" className="max-w-sm">
        <NativeSelect
          id="b-payer"
          name="payerId"
          defaultValue={defaultPayer}
          options={parties.map((p) => ({ value: p.id, label: p.name }))}
        />
      </Field>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 font-medium">Line</th>
            <th className="py-2 text-right font-medium">Unit</th>
            <th className="py-2 text-right font-medium">Left</th>
            <th className="w-24 py-2 text-right font-medium">Invoice now</th>
          </tr>
        </thead>
        <tbody>
          {open.map((l) => (
            <tr key={l.key} className="border-b last:border-0">
              <td className="py-2">
                {l.description}{" "}
                <span className="font-mono text-xs text-muted-foreground">{l.vatCode}</span>
              </td>
              <td className="py-2 text-right tabular-nums">{formatCents(l.unitCents)}</td>
              <td className="py-2 text-right tabular-nums">
                {l.remaining} / {l.qty}
              </td>
              <td className="py-2 text-right">
                <Input
                  name={`qty:${l.key}`}
                  type="number"
                  min={0}
                  max={l.remaining}
                  defaultValue={l.remaining}
                  aria-label={`Quantity to invoice for ${l.description}`}
                  className="ml-auto w-20 text-right"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create draft invoice"}
        </Button>
      </div>
    </ActionForm>
  );
}
