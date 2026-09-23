"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import type { TaskState } from "@/domain/tasks";
import { useToastedAction } from "@/hooks/use-action-toast";
import { completeTask, handOverTask, putBackTask, reopenTask, withdrawTask } from "../actions";

type Staff = { id: string; name: string }[];

function Move({
  action,
  id,
  version,
  label,
  variant = "outline",
}: {
  action: typeof completeTask;
  id: string;
  version: number;
  label: string;
  variant?: "default" | "outline";
}) {
  const [, run, pending] = useToastedAction(action);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {label}
      </Button>
    </ActionForm>
  );
}

function HandOver({ id, version, staff }: { id: string; version: number; staff: Staff }) {
  const [open, setOpen] = useState(false);
  const [, run, pending] = useToastedAction(handOverTask, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>Hand over</DialogTrigger>
      <DialogContent>
        <ActionForm action={run} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Hand over this task</DialogTitle>
          </DialogHeader>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <NativeSelect
            name="assigneeId"
            aria-label="To a person"
            placeholder="— to a person —"
            options={staff.map((s) => ({ value: s.id, label: s.name }))}
          />
          <NativeSelect
            name="role"
            aria-label="Or to a role"
            placeholder="— or to a role (anyone who holds it) —"
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Hand over
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

/** The moves a task allows in its state: done ↔ open, withdrawn ↔ open, hand over. */
export function TaskActions({
  id,
  version,
  state,
  staff,
}: {
  id: string;
  version: number;
  state: TaskState;
  staff: Staff;
}) {
  if (state === "done")
    return <Move action={reopenTask} id={id} version={version} label="Reopen" />;
  if (state === "withdrawn")
    return <Move action={putBackTask} id={id} version={version} label="Put back" />;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <HandOver id={id} version={version} staff={staff} />
      <ReasonDialog
        action={withdrawTask}
        hidden={{ id, version }}
        trigger="Withdraw"
        title="Withdraw this task?"
        description="It leaves the lists but keeps its history; you can put it back."
        confirmLabel="Withdraw"
      />
      <Move action={completeTask} id={id} version={version} label="Done" variant="default" />
    </div>
  );
}
