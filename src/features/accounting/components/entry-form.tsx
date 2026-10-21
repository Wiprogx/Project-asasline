"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createEntry } from "../entry-actions";
import { journalEntrySchema } from "../schemas";

/** Write an entry by hand: one row per line, `account | debit | credit | label`. */
export function EntryForm({ today }: { today: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useToastedAction(
    createEntry,
    () => form.current?.reset(),
    journalEntrySchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm ref={form} action={run} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field id="je-date" label="Date" error={fe?.date}>
          <Input id="je-date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field id="je-label" label="What it is for" error={fe?.label}>
          <Input id="je-label" name="label" required placeholder="Rent of September booked twice" />
        </Field>
      </div>
      <Field
        id="je-lines"
        label="Lines"
        hint="One per row: account | debit | credit | label. Debits and credits must balance."
        error={fe?.lines}
      >
        <Textarea
          id="je-lines"
          name="lines"
          rows={5}
          required
          className="font-mono"
          placeholder={"440000 | 1200.00 | | Supplier\n612000 | | 1200.00 | Rent"}
        />
      </Field>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Booking…" : "Book the entry"}
        </Button>
      </div>
    </ActionForm>
  );
}
