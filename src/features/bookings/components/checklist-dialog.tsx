"use client";

import { FormDialog } from "@/components/shared/form-dialog";
import { Input } from "@/components/ui/input";
import type { Checklist } from "@/domain/checklists";
import { checkWithList } from "../review-actions";

/** The paper checked item by item (legacy openChecklist): tick what is actually on it. */
export function ChecklistDialog({
  bookingId,
  code,
  list,
}: {
  bookingId: string;
  code: string;
  list: Checklist;
}) {
  return (
    <FormDialog
      action={checkWithList}
      hidden={{ bookingId, code, list: list.key }}
      trigger="Check the paper"
      title={`${list.label} — ${code}`}
      description="Tick what is actually on the paper. Anything left unticked becomes its own task; it does not hold up the rest."
      submitLabel="Done checking"
    >
      {() => (
        <>
          <ul className="grid gap-2 text-sm">
            {list.items.map((i) => (
              <li key={i.k}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="items" value={i.k} className="mt-0.5 size-4" />
                  <span>
                    {i.t}
                    {i.hint && (
                      <span className="block text-xs text-muted-foreground">{i.hint}</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Input name="reason" placeholder="Anything worth recording" aria-label="Note" />
        </>
      )}
    </FormDialog>
  );
}
