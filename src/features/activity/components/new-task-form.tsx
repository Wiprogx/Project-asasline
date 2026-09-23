"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createTask } from "../actions";

type Props = {
  staff: { id: string; name: string }[];
  meId: string;
  link?: { kind: "booking"; id: string };
  defaultDue?: string;
};

/** Assigned to me by default; clear the person and pick a role to leave it for anyone in it. */
export function NewTaskForm({ staff, meId, link, defaultDue }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useToastedAction(createTask, () => form.current?.reset());
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <ActionForm
      ref={form}
      action={run}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_9rem_1fr_1fr_auto] lg:items-end"
    >
      {link && (
        <>
          <input type="hidden" name="linkKind" value={link.kind} />
          <input type="hidden" name="linkId" value={link.id} />
        </>
      )}
      <Field id="t-title" label="New task" error={fe?.title}>
        <Input id="t-title" name="title" required placeholder="e.g. Send the VGM to the line" />
      </Field>
      <Field id="t-due" label="Due" error={fe?.due}>
        <Input id="t-due" name="due" type="date" defaultValue={defaultDue} />
      </Field>
      <Field id="t-assignee" label="Person" error={fe?.assigneeId}>
        <NativeSelect
          id="t-assignee"
          name="assigneeId"
          defaultValue={meId}
          placeholder="— nobody yet —"
          options={staff.map((s) => ({ value: s.id, label: s.name }))}
        />
      </Field>
      <Field id="t-role" label="Role">
        <NativeSelect
          id="t-role"
          name="role"
          placeholder="—"
          options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add task"}
      </Button>
    </ActionForm>
  );
}
