"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { closeBooksThrough, fileVatReturn } from "../vat-actions";

/** Marks the period as filed once it has been sent through Intervat. */
export function FileVatButton({ period }: { period: string }) {
  const [, run, pending] = useToastedAction(fileVatReturn);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="period" value={period} />
      <Button type="submit" disabled={pending}>
        Mark as filed
      </Button>
    </ActionForm>
  );
}

/** Closes the books through a past day; nothing dated on or before it can change afterwards. */
export function CloseBooksForm({ suggested }: { suggested: string }) {
  const [state, run, pending] = useToastedAction(closeBooksThrough);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={run} className="flex flex-wrap items-end gap-2">
      <Field id="close-through" label="Close the books through" error={fe?.through}>
        <Input id="close-through" name="through" type="date" defaultValue={suggested} required />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Close
      </Button>
    </ActionForm>
  );
}
