"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { markPeppolSent } from "../peppol-actions";

/** The office sent the file through the access point: write the day on the invoice. */
export function PeppolSentButton({ id }: { id: string }) {
  const [, run, pending] = useToastedAction(markPeppolSent);
  return (
    <ActionForm action={run} className="inline">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Marking…" : "Sent by Peppol"}
      </Button>
    </ActionForm>
  );
}
