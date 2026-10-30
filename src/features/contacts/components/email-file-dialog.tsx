"use client";

import { Paperclip } from "lucide-react";
import { type ReactElement, useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
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
import { sendContactFile } from "../file-send";
import type { ContactFile } from "../file-queries";
import { sendContactFileSchema } from "../schemas";

/**
 * One paper of the contact's file, sent by e-mail: to the contact's address by default, the
 * file attached, the office's signature added on send. Without a mail server it opens in the
 * person's own mail app.
 */
export function EmailFileDialog({
  contactId,
  email,
  file,
  trigger,
}: {
  contactId: string;
  email: string | null;
  file: ContactFile;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(
    sendContactFile,
    (data) => {
      if (data?.href) window.open(data.href, "_blank", "noopener");
      setOpen(false);
    },
    sendContactFileSchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  const id = `ef-${file.where.kind}-${file.id}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xl">
        <ActionForm action={run} className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Send by e-mail</DialogTitle>
            <DialogDescription>
              Recorded on the contact&apos;s messages, then sent.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="contactId" value={contactId} />
          <input type="hidden" name="fileId" value={file.id} />
          <input type="hidden" name="where" value={file.where.kind} />
          <Field id={`${id}-to`} label="To" error={fe?.to}>
            <Input
              id={`${id}-to`}
              name="to"
              type="email"
              autoComplete="email"
              defaultValue={email ?? ""}
              required
            />
          </Field>
          <Field
            id={`${id}-cc`}
            label="Copy to"
            hint="Several, separated by commas."
            error={fe?.cc}
          >
            <Input id={`${id}-cc`} name="cc" />
          </Field>
          <Field id={`${id}-s`} label="Subject" error={fe?.subject}>
            <Input id={`${id}-s`} name="subject" defaultValue={file.name} required />
          </Field>
          <Field id={`${id}-b`} label="Message" error={fe?.body}>
            <Textarea
              id={`${id}-b`}
              name="body"
              rows={7}
              defaultValue={`Hello,\n\nPlease find attached ${file.name}.\n\nKind regards,`}
            />
          </Field>
          <p className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
            <Paperclip className="size-4 text-muted-foreground" aria-hidden />
            <span className="truncate">{file.name}</span>
          </p>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
