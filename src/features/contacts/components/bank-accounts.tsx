"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ibanPretty } from "@/domain/iban";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addBankAccount, archiveBankAccount } from "../bank-actions";

type Account = { id: string; iban: string; bic: string | null; label: string | null };

/** The contact's IBANs: to pay a supplier, and to recognise a payment from them. */
export function BankAccounts({ contactId, accounts }: { contactId: string; accounts: Account[] }) {
  const [state, run, pending] = useToastedAction(addBankAccount);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Bank accounts</h2>
      </CardHeader>
      <CardContent className="grid gap-3">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No IBAN yet.</p>
        ) : (
          <ul className="grid gap-2">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm">
                  {ibanPretty(a.iban)}
                  {a.bic && <span className="text-muted-foreground"> · {a.bic}</span>}
                  {a.label && <span className="font-sans text-muted-foreground"> · {a.label}</span>}
                </span>
                <ReasonDialog
                  action={archiveBankAccount}
                  hidden={{ id: a.id, contactId }}
                  trigger="Remove"
                  title="Remove this IBAN?"
                  description="It stays on the record with your reason; past payments keep pointing at it."
                  confirmLabel="Remove"
                />
              </li>
            ))}
          </ul>
        )}
        <ActionForm
          action={run}
          className="grid gap-2 sm:grid-cols-[1fr_9rem_10rem_auto] sm:items-end"
        >
          <input type="hidden" name="contactId" value={contactId} />
          <Field id="ba-iban" label="IBAN" error={fe?.iban}>
            <Input id="ba-iban" name="iban" required autoComplete="off" />
          </Field>
          <Field id="ba-bic" label="BIC" error={fe?.bic}>
            <Input id="ba-bic" name="bic" autoComplete="off" />
          </Field>
          <Field id="ba-label" label="Label" error={fe?.label}>
            <Input id="ba-label" name="label" />
          </Field>
          <Button type="submit" variant="outline" disabled={pending}>
            Add IBAN
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
