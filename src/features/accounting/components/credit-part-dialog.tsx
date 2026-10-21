"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import { creditPart } from "../credit-actions";

export type CreditableLine = { id: string; description: string; qty: number; left: number };

/** Credit part of an invoice (legacy creditPart): how many of each line, the invoice stays. */
export function CreditPartDialog({
  id,
  version,
  lines,
}: {
  id: string;
  version: number;
  lines: CreditableLine[];
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(creditPart, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Credit part</DialogTrigger>
      <DialogContent>
        <ActionForm action={run} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Credit part of this invoice</DialogTitle>
            <DialogDescription>
              How many of each line are given back. The invoice stays; the credit note is a new
              document with its own number.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <ul className="grid gap-2">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <label htmlFor={`cp-${l.id}`} className="min-w-0 [overflow-wrap:anywhere]">
                  {l.description}
                  <span className="block text-xs text-muted-foreground">
                    {l.left === l.qty ? `${l.qty} on the invoice` : `${l.left} of ${l.qty} left`}
                  </span>
                </label>
                <Input
                  id={`cp-${l.id}`}
                  name={`qty.${l.id}`}
                  type="number"
                  min={0}
                  max={l.left}
                  step={1}
                  defaultValue={0}
                  disabled={l.left === 0}
                  className="w-20"
                />
              </li>
            ))}
          </ul>
          <Textarea
            name="reason"
            required
            minLength={3}
            placeholder="Why? It is printed on the credit note."
            aria-label="Reason"
          />
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              Issue the credit note
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
