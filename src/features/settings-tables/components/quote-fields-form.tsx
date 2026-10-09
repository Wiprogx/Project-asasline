"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QUOTE_FIELD_KEYS, QUOTE_FIELD_LABEL, type QuoteFields } from "@/domain/quote-fields";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveQuoteFields } from "../document-actions";

/** What the printed quotation shows (legacy QUOTE_FIELDS): one switch per part. */
export function QuoteFieldsForm({ fields, version }: { fields: QuoteFields; version: number }) {
  const [, run, pending] = useToastedAction(saveQuoteFields);
  return (
    <Card>
      <CardHeader>
        <CardTitle>What the printed quotation shows</CardTitle>
        <CardDescription>
          Every quotation printed or sent from now on obeys these; the figures stay on the quotation
          itself whatever is shown to the customer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={run} className="grid gap-3">
          <input type="hidden" name="version" value={version} />
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {QUOTE_FIELD_KEYS.map((k) => (
              <li key={k}>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name={k} defaultChecked={fields[k]} className="size-4" />
                  {QUOTE_FIELD_LABEL[k]}
                </label>
              </li>
            ))}
          </ul>
          <div>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? "Saving…" : "Save the printed quotation"}
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
