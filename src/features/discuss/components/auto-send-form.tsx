"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { AUTO_CHANNELS, type AutoSend } from "@/domain/channels";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveAutoSend } from "../channel-actions";

const CHANNEL_LABEL: Record<AutoSend["channel"], string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  both: "WhatsApp when the customer has it, else e-mail",
};

/** Tracking news without asking (legacy AUTO_SEND): pick-up, terminal, sailing, delay and arrival. */
export function AutoSendForm({ setting, version }: { setting: AutoSend; version: number }) {
  const [, run, pending] = useToastedAction(saveAutoSend);
  return (
    <ActionForm action={run} className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
      <input type="hidden" name="version" value={version} />
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={setting.enabled}
          className="size-4 accent-primary"
        />
        Send tracking updates without asking
      </label>
      <Field id="auto-channel" label="Channel">
        <NativeSelect
          id="auto-channel"
          name="channel"
          defaultValue={setting.channel}
          options={AUTO_CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))}
        />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save automatic sending"}
      </Button>
    </ActionForm>
  );
}
