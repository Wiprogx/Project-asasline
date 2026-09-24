"use client";

import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Input } from "@/components/ui/input";
import { VAT_CODES } from "@/domain/accounting";
import { removeLine, updateLine } from "../line-actions";

type Line = {
  id: string;
  description: string;
  qty: number;
  sellCents: number | null;
  costCents: number | null;
  vatCode: string;
};

const euros = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));

/** Change a line's text, quantity or price, or take it off with a reason. */
export function LineControls({
  quotationId,
  version,
  line: l,
  showCost,
}: {
  quotationId: string;
  version: number;
  line: Line;
  showCost: boolean;
}) {
  const hidden = { quotationId, version, lineId: l.id };
  const id = (name: string) => `le-${l.id}-${name}`;
  return (
    <div className="flex justify-end gap-2">
      <FormDialog
        action={updateLine}
        hidden={hidden}
        trigger="Edit"
        title={l.description}
        description="A sell price you change is marked as typed."
        submitLabel="Save line"
      >
        {(fe) => (
          <>
            <Field id={id("description")} label="Service" error={fe?.description}>
              <Input id={id("description")} name="description" defaultValue={l.description} />
            </Field>
            <Field id={id("qty")} label="Quantity" error={fe?.qty}>
              <Input id={id("qty")} name="qty" type="number" min="1" defaultValue={l.qty} />
            </Field>
            <Field id={id("sell")} label="Sell (EUR)" error={fe?.sellCents}>
              <Input
                id={id("sell")}
                name="sellCents"
                type="number"
                step="0.01"
                min="0"
                defaultValue={euros(l.sellCents)}
              />
            </Field>
            {showCost && (
              <Field id={id("cost")} label="Cost (EUR)" error={fe?.costCents}>
                <Input
                  id={id("cost")}
                  name="costCents"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={euros(l.costCents)}
                />
              </Field>
            )}
            <Field id={id("vat")} label="VAT" error={fe?.vatCode}>
              <NativeSelect
                id={id("vat")}
                name="vatCode"
                defaultValue={l.vatCode}
                options={VAT_CODES.map((v) => ({ value: v.code, label: v.label }))}
              />
            </Field>
          </>
        )}
      </FormDialog>
      <ReasonDialog
        action={removeLine}
        hidden={hidden}
        trigger="Remove"
        title={`Take "${l.description}" off?`}
        description="It leaves the price and the booking; it stays on the record with your reason."
        confirmLabel="Remove"
      />
    </div>
  );
}
