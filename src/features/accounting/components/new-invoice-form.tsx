"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { blankDraft } from "../draft-actions";

/** A draft for a customer, not tied to a booking; lines are added on the draft. */
export function NewInvoiceForm({ customers }: { customers: { id: string; name: string }[] }) {
  const [, run, pending] = useToastedAction(blankDraft);
  return (
    <ActionForm action={run} className="flex flex-wrap items-center gap-2">
      <NativeSelect
        name="customerId"
        required
        aria-label="Customer"
        placeholder="Customer…"
        className="w-64"
        options={customers.map((c) => ({ value: c.id, label: c.name }))}
      />
      <Button type="submit" size="sm" disabled={pending}>
        New invoice
      </Button>
    </ActionForm>
  );
}
