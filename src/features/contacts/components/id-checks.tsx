"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { markIdChecked } from "../id-actions";

type Check = {
  kind: "vat" | "eori";
  label: string;
  value: string | null;
  checkedOn: string | null;
  /** The online register that knows this number (VIES, the EORI register), or null: the office's word. */
  register: string | null;
};

/** When each number was last found in its register (legacy tvaChecked / eoriChecked), and the button that asks the register again. */
export function IdChecks({ contactId, checks }: { contactId: string; checks: Check[] }) {
  const [, run, pending] = useToastedAction(markIdChecked);
  const shown = checks.filter((c) => c.value);
  if (shown.length === 0) return null;
  return (
    <ul className="grid gap-2 text-sm">
      {shown.map((c) => (
        <li key={c.kind} className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {c.label} <span className="font-mono">{c.value}</span>
            <span className="text-muted-foreground">
              {c.checkedOn
                ? ` · checked against the register on ${c.checkedOn}`
                : " · never checked against the register"}
            </span>
          </span>
          <ActionForm action={run}>
            <input type="hidden" name="id" value={contactId} />
            <input type="hidden" name="kind" value={c.kind} />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {c.register ? `Check ${c.label} at ${c.register}` : `${c.label} checked today`}
            </Button>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}
