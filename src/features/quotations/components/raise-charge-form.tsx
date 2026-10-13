"use client";

import { useRef, useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { centsToInput } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { raiseCharge } from "../charge-actions";
import { raiseChargeSchema } from "../charge-schemas";

type Item = { id: string; label: string; sellCents: number; buyCents: number };

/**
 * Raise a charge from the booking (legacy "+ Extra charge"): waiting time, a scanner move,
 * storage… — it goes on the quotation's destination, priced from the catalogue unless typed,
 * charged once unless it really applies to every container.
 */
export function RaiseChargeForm({
  quotation,
  routeId,
  bookingId,
  boxes,
  items,
  canSeeCost,
  title = "Raise a charge",
  preset,
}: {
  title?: string;
  /** Filled in for a known charge (legacy chargeExtraTime): the item, how many, why. */
  preset?: { itemId: string | null; qty: number; reason: string };
  quotation: { id: string; ref: string; version: number };
  routeId: string;
  bookingId: string;
  boxes: number;
  items: Item[];
  canSeeCost: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [item, setItem] = useState<Item | null>(items.find((i) => i.id === preset?.itemId) ?? null);
  const [state, run, pending] = useToastedAction(
    raiseCharge,
    () => {
      form.current?.reset();
      setItem(null);
    },
    raiseChargeSchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          It goes on {quotation.ref}, the destination this booking ships, so it is invoiced instead
          of forgotten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm ref={form} action={run} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="quotationId" value={quotation.id} />
          <input type="hidden" name="version" value={quotation.version} />
          <input type="hidden" name="routeId" value={routeId} />
          <input type="hidden" name="bookingId" value={bookingId} />
          <Field id="charge-item" label="Charge" error={fe?.itemId} className="sm:col-span-2">
            <NativeSelect
              id="charge-item"
              name="itemId"
              required
              placeholder="Waiting time, scanner, storage…"
              defaultValue={preset?.itemId ?? undefined}
              onChange={(e) => setItem(items.find((i) => i.id === e.target.value) ?? null)}
              options={items.map((i) => ({ value: i.id, label: i.label }))}
            />
          </Field>
          <Field id="charge-qty" label="Quantity, days or hours" error={fe?.qty}>
            <Input
              id="charge-qty"
              name="qty"
              type="number"
              min={1}
              defaultValue={preset?.qty ?? 1}
            />
          </Field>
          <Field
            id="charge-sell"
            label="Sell (EUR, each)"
            hint="Empty: the catalogue's price."
            error={fe?.sellCents}
          >
            <Input
              id="charge-sell"
              name="sellCents"
              inputMode="decimal"
              key={`s-${item?.id ?? ""}`}
              defaultValue={item ? centsToInput(item.sellCents) : ""}
            />
          </Field>
          {canSeeCost && (
            <Field id="charge-buy" label="Buy (EUR, each)" error={fe?.costCents}>
              <Input
                id="charge-buy"
                name="costCents"
                inputMode="decimal"
                key={`b-${item?.id ?? ""}`}
                defaultValue={item ? centsToInput(item.buyCents) : ""}
              />
            </Field>
          )}
          {boxes > 1 ? (
            <Field
              id="charge-applies"
              label="Applies to"
              hint="A charge raised for one box — a scanner move, waiting time at one loading — is charged once."
            >
              <NativeSelect
                id="charge-applies"
                name="appliesTo"
                defaultValue="one"
                options={[
                  { value: "one", label: "One container — charged once" },
                  { value: "all", label: `Every container — charged ${boxes}×` },
                ]}
              />
            </Field>
          ) : (
            <input type="hidden" name="appliesTo" value="one" />
          )}
          <Field id="charge-reason" label="Reason — shown in the history" className="sm:col-span-2">
            <Input
              id="charge-reason"
              name="reason"
              defaultValue={preset?.reason}
              placeholder="Customs pulled the box for scanning"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              Add to the quotation
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
