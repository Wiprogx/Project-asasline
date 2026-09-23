"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { autoMatch, importStatement, matchLine } from "../bank-actions";

export function ImportStatement() {
  const form = useRef<HTMLFormElement>(null);
  const [, run, pending] = useToastedAction(importStatement, () => form.current?.reset());
  return (
    <ActionForm ref={form} action={run} className="flex flex-wrap items-center gap-2">
      <Input
        name="file"
        type="file"
        accept=".cod,.coda,.txt,.csv"
        required
        aria-label="Statement file (CODA or CSV)"
        className="max-w-xs"
      />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Importing…" : "Import statement"}
      </Button>
    </ActionForm>
  );
}

export function AutoMatch() {
  const [, run, pending] = useToastedAction(autoMatch);
  return (
    <ActionForm action={run}>
      <Button type="submit" disabled={pending}>
        {pending ? "Matching…" : "Match the sure ones"}
      </Button>
    </ActionForm>
  );
}

export function MatchButton({
  lineId,
  invoiceId,
  label,
}: {
  lineId: string;
  invoiceId: string;
  label: string;
}) {
  const [, run, pending] = useToastedAction(matchLine);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="lineId" value={lineId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {label}
      </Button>
    </ActionForm>
  );
}
