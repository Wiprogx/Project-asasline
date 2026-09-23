"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ibanPretty } from "@/domain/iban";
import { formatCents } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { makeSepaFile } from "../sepa-actions";

type Bill = {
  id: string;
  number: string | null;
  supplier: string;
  supplierRef: string | null;
  dueDate: string | null;
  openCents: number;
  iban: string | null;
  problem: string | null;
};

/** Tick the bills to pay; the file downloads once made. What cannot be paid says why. */
export function SepaForm({
  bills,
  payBy,
  tomorrow,
}: {
  bills: Bill[];
  payBy: string;
  tomorrow: string;
}) {
  const [state, run, pending] = useToastedAction(makeSepaFile, (data) => {
    if (!data?.batchId) return;
    // A file, not a page: download it without leaving the screen.
    const link = document.createElement("a");
    link.href = `/accounting/sepa/${data.batchId}/file`;
    link.download = "";
    link.click();
  });
  const fe = !state.ok ? state.fieldErrors : undefined;
  if (bills.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Nothing to pay.</p>;
  return (
    <ActionForm action={run} className="grid gap-3">
      <ul className="grid gap-2">
        {bills.map((b) => (
          <li key={b.id}>
            <label
              className={`flex items-start gap-3 rounded-md border p-2.5 ${b.problem ? "opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                name="ids"
                value={b.id}
                disabled={!!b.problem}
                defaultChecked={!b.problem && (!b.dueDate || b.dueDate <= payBy)}
                className="mt-1 size-4"
                aria-label={`Pay ${b.number}`}
              />
              <span className="min-w-0 flex-1">
                <span className="font-mono text-sm">{b.number}</span> · {b.supplier}
                {b.supplierRef && (
                  <span className="text-muted-foreground"> · their {b.supplierRef}</span>
                )}
                <span className="block text-xs text-muted-foreground">
                  {b.problem ?? ibanPretty(b.iban ?? "")}
                  {b.dueDate && ` · due ${b.dueDate}`}
                </span>
              </span>
              <span className="tabular-nums">{formatCents(b.openCents)}</span>
            </label>
          </li>
        ))}
      </ul>
      {fe?.ids && <p className="text-sm text-destructive">{fe.ids[0]}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <Field id="sepa-date" label="Execution date" error={fe?.executionDate}>
          <Input id="sepa-date" name="executionDate" type="date" defaultValue={tomorrow} required />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Making…" : "Make SEPA file"}
        </Button>
      </div>
    </ActionForm>
  );
}
