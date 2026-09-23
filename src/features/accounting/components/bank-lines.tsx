import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { formatCents } from "@/domain/money";
import { ignoreLine } from "../bank-actions";
import type { bankLinesWithProposals } from "../queries";
import { MatchButton } from "./bank-controls";

type Row = Awaited<ReturnType<typeof bankLinesWithProposals>>[number];

const CONFIDENCE = { 3: "sure", 2: "likely", 1: "check" } as const;

/** Statement lines: what each open line probably pays, and why; matched and set-aside below. */
export function BankLines({ rows, canAct }: { rows: Row[]; canAct: boolean }) {
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No statement imported yet.</p>
    );
  return (
    <ul>
      {rows.map(({ line: l, proposals }) => (
        <li key={l.id} className="grid gap-2 border-b py-3 last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{l.date}</span>
              <span
                className={l.amountCents < 0 ? "text-destructive tabular-nums" : "tabular-nums"}
              >
                {formatCents(l.amountCents)}
              </span>
              <span className="font-medium">{l.name ?? "—"}</span>
              {l.iban && <span className="font-mono text-xs text-muted-foreground">{l.iban}</span>}
              <span className="text-muted-foreground">{l.ogm ?? l.comm ?? ""}</span>
            </span>
            {l.state === "matched" && <ToneBadge tone="success">Matched</ToneBadge>}
            {l.state === "ignored" && <ToneBadge tone="neutral">Set aside — {l.note}</ToneBadge>}
          </div>
          {l.state === "open" && canAct && (
            <div className="flex flex-wrap items-center gap-2 pl-4 text-xs text-muted-foreground">
              {proposals.length === 0 && (
                <span>
                  {l.amountCents < 0
                    ? "Money out — supplier bills come in the next step."
                    : "No invoice found."}
                </span>
              )}
              {proposals.map((p) => (
                <span key={p.invoiceId} className="flex items-center gap-2">
                  <MatchButton lineId={l.id} invoiceId={p.invoiceId} label={`Pays ${p.number}`} />
                  <span>
                    {CONFIDENCE[p.confidence]}: {p.why} · open {formatCents(p.openCents)}
                  </span>
                </span>
              ))}
              <ReasonDialog
                action={ignoreLine}
                hidden={{ lineId: l.id }}
                trigger="Set aside"
                title="Set this line aside?"
                description="For a line that pays no invoice here (a transfer between our accounts, bank fees…)."
                confirmLabel="Set aside"
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
