"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import { postInternal } from "../actions";

/** Internal chat. Enter sends, Shift+Enter breaks the line; an SB/QT number links the message. */
export function ChatComposer({ room }: { room: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [, run, pending] = useToastedAction(postInternal, () => form.current?.reset());
  return (
    <ActionForm ref={form} action={run} className="flex items-end gap-2">
      <input type="hidden" name="room" value={room} />
      <Textarea
        name="body"
        required
        rows={2}
        aria-label="Message"
        placeholder="Write to the room… (SB2609001 links the booking)"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <Button type="submit" disabled={pending}>
        Send
      </Button>
    </ActionForm>
  );
}
