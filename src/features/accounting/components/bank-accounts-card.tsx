import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ibanPretty } from "@/domain/bank-accounts";
import { formatCents } from "@/domain/money";
import type { bankStandings } from "../bank-queries";

type Row = Awaited<ReturnType<typeof bankStandings>>[number];

/** Each account: the balance on the statements, the balance in the books, what is still to reconcile. */
export function BankAccountsCard({ rows }: { rows: Row[] }) {
  if (rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No bank account named yet —{" "}
        <Link className="underline" href="/settings/accounting">
          add the office&apos;s account
        </Link>{" "}
        (its IBAN, and the balance on the day the books started) to see the statements against the
        books.
      </p>
    );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(({ account: a, standing: s }) => (
        <Card key={a.iban}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              {a.name}
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {ibanPretty(a.iban)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Balance on the statements</dt>
              <dd className="font-medium tabular-nums">{formatCents(s.statementCents)}</dd>
              <dt className="text-muted-foreground">Balance in the books ({a.account})</dt>
              <dd className="tabular-nums">{formatCents(s.booksCents)}</dd>
              <dt className="text-muted-foreground">To reconcile</dt>
              <dd>
                <ToneBadge tone={s.openCount ? "warning" : "success"}>
                  {s.openCount ? `${s.openCount} · ${formatCents(s.openCents)}` : "nothing"}
                </ToneBadge>
              </dd>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              The two balances meet once every line is reconciled and every payment registered by
              hand has reached a statement.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
