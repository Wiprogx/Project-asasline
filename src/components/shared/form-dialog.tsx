"use client";

import { type ReactNode, useState } from "react";
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
import { useToastedAction } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { ActionForm } from "./action-form";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/**
 * An edit in a dialog: the fields are the children, the dialog closes when the action
 * succeeds and stays open — with what was typed — when it refuses.
 */
export function FormDialog({
  action,
  hidden,
  trigger,
  title,
  description,
  submitLabel,
  children,
}: {
  action: Action;
  hidden: Record<string, string | number>;
  trigger: string;
  title: string;
  description?: string;
  submitLabel: string;
  children: (fieldErrors: Record<string, string[] | undefined> | undefined) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(action, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <ActionForm action={run} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="grid gap-3">{children(!state.ok ? state.fieldErrors : undefined)}</div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
