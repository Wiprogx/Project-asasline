"use client";

import { ActionForm } from "./action-form";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { NativeSelect } from "./native-select";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/**
 * Archive / cancel / withdraw with a mandatory reason — the app's replacement for delete.
 * With `reasons`, the person picks a text from the editable Settings list; with
 * `reasonOptions`, a row of a reasons table, posted as `reasonId`.
 */
export function ReasonDialog({
  action,
  hidden,
  trigger,
  title,
  description,
  confirmLabel,
  reasons,
  reasonOptions,
}: {
  action: Action;
  hidden: Record<string, string | number>;
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
  reasons?: readonly string[];
  reasonOptions?: readonly { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [, formAction, pending] = useToastedAction(action, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <ActionForm action={formAction} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {reasonOptions ? (
            <NativeSelect
              name="reasonId"
              aria-label="Reason"
              required
              options={reasonOptions}
              placeholder="Choose a reason…"
            />
          ) : reasons ? (
            <NativeSelect
              name="reason"
              aria-label="Reason"
              required
              options={reasons.map((r) => ({ value: r, label: r }))}
              placeholder="Choose a reason…"
            />
          ) : (
            <Textarea
              name="reason"
              aria-label="Reason"
              required
              minLength={3}
              placeholder="Why? It stays on the record."
            />
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
