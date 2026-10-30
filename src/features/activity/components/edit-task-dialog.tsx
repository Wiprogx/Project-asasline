"use client";

import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { editTask } from "../edit-actions";

export type TaskWords = {
  title: string;
  typeId: string | null;
  due: string | null;
  note: string | null;
};

/** Correct what the task says and when it is due (legacy editActivity). */
export function EditTaskDialog({
  id,
  version,
  task,
  types,
}: {
  id: string;
  version: number;
  task: TaskWords;
  types: readonly { value: string; label: string; code?: string | null }[];
}) {
  const f = (name: string) => `te-${id}-${name}`;
  return (
    <FormDialog
      action={editTask}
      hidden={{ id, version }}
      trigger="Edit"
      title="Edit the task"
      description="To give it to somebody else, hand it over."
      submitLabel="Save task"
    >
      {(fe) => (
        <>
          <Field id={f("title")} label="What needs doing" error={fe?.title}>
            <Input id={f("title")} name="title" required defaultValue={task.title} />
          </Field>
          <Field id={f("typeId")} label="Type" error={fe?.typeId}>
            <NativeSelect
              id={f("typeId")}
              name="typeId"
              defaultValue={task.typeId ?? ""}
              placeholder="—"
              options={types}
            />
          </Field>
          <Field id={f("due")} label="Due" error={fe?.due}>
            <Input id={f("due")} name="due" type="date" defaultValue={task.due ?? ""} />
          </Field>
          <Field id={f("note")} label="Note" error={fe?.note}>
            <Textarea id={f("note")} name="note" defaultValue={task.note ?? ""} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
