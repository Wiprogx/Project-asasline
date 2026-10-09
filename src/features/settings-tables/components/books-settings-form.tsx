"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type BooksSettings, VAT_PERIODS } from "@/domain/accounting-settings";
import { centsToInput } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveBooksSettings } from "../accounting-actions";
import { booksSettingsSchema } from "../schemas";
import { fxToInput } from "@/domain/fx";

/** The figures of the books the office edits (legacy BOOKS.approveOver, BOOKS.vatPeriod, BOOKS.fx). */
export function BooksSettingsForm({ books, version }: { books: BooksSettings; version: number }) {
  const [state, run, pending] = useToastedAction(saveBooksSettings, undefined, booksSettingsSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Books</CardTitle>
        <CardDescription>
          A bill at or above the threshold needs a second person before it is paid; the VAT return
          is monthly (by the 20th) or quarterly (by the 25th). A document in dollars or pounds
          starts from these rates (euro for one unit) and keeps its own. The close day moves from
          the VAT screen.
          {books.closedThrough ? ` Closed through ${books.closedThrough}.` : " Nothing closed yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm
          action={run}
          className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[12rem_10rem_12rem_8rem_8rem_auto] lg:items-end"
        >
          <input type="hidden" name="version" value={version} />
          <Field id="approveOver" label="Approval from (EUR)" error={fe?.approveOver}>
            <Input
              id="approveOver"
              name="approveOver"
              inputMode="decimal"
              defaultValue={centsToInput(books.approveOverCents)}
            />
          </Field>
          <Field id="vatPeriod" label="VAT return" error={fe?.vatPeriod}>
            <NativeSelect
              id="vatPeriod"
              name="vatPeriod"
              defaultValue={books.vatPeriod}
              options={VAT_PERIODS.map((p) => ({
                value: p,
                label: p[0].toUpperCase() + p.slice(1),
              }))}
            />
          </Field>
          <Field
            id="parallelUntil"
            label="Alongside Odoo until"
            hint="Empty once the app keeps the books alone."
            error={fe?.parallelUntil}
          >
            <Input
              id="parallelUntil"
              name="parallelUntil"
              type="date"
              defaultValue={books.parallelUntil ?? ""}
            />
          </Field>
          <Field id="fxUsd" label="Euro for 1 USD" error={fe?.fxUsd}>
            <Input
              id="fxUsd"
              name="fxUsd"
              inputMode="decimal"
              defaultValue={fxToInput(books.fx.USD)}
            />
          </Field>
          <Field id="fxGbp" label="Euro for 1 GBP" error={fe?.fxGbp}>
            <Input
              id="fxGbp"
              name="fxGbp"
              inputMode="decimal"
              defaultValue={fxToInput(books.fx.GBP)}
            />
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save books"}
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
