import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";

/**
 * How the office prices this customer (legacy CF "term" and "pricing"): the payment terms a new
 * quotation starts with, and whether a line without an agreed price takes the last price quoted.
 */
export function PricingFields({
  terms,
  paymentTermId,
  usesLastPrice,
  error,
}: {
  terms: readonly { value: string; label: string }[];
  paymentTermId?: string | null;
  usesLastPrice?: boolean;
  error?: string[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        id="paymentTermId"
        label="Payment terms"
        hint="A new quotation for this customer starts with these terms."
        error={error}
      >
        <NativeSelect
          id="paymentTermId"
          name="paymentTermId"
          defaultValue={paymentTermId ?? ""}
          placeholder="The office default"
          options={terms}
        />
      </Field>
      <label className="flex items-start gap-2 self-end pb-2 text-sm">
        {/* An unticked box posts nothing; this says "off", and a ticked box's "on" comes after it. */}
        <input type="hidden" name="usesLastPrice" value="off" />
        <input
          type="checkbox"
          name="usesLastPrice"
          defaultChecked={usesLastPrice ?? false}
          className="mt-0.5 size-4"
        />
        <span>
          Without an agreed price, use the last price we quoted this customer
          <span className="block text-xs text-muted-foreground">
            Otherwise the catalogue price; the last price always shows as a hint.
          </span>
        </span>
      </label>
    </div>
  );
}
