import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { accountName } from "@/domain/ledger";
import { formatCents } from "@/domain/money";
import { reverseEntry } from "../entry-actions";
import type { listEntries } from "../entry-queries";

type Row = Awaited<ReturnType<typeof listEntries>>[number];

/** Each entry with its lines, what reversed it, and — while it stands — its Reverse button. */
export function EntriesList({
  rows,
  canWrite,
  chart,
}: {
  rows: Row[];
  canWrite: boolean;
  chart?: Readonly<Record<string, string>>;
}) {
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No entry written by hand.</p>
    );
  return (
    <ul className="grid gap-3">
      {rows.map((e) => (
        <li key={e.id} className="grid gap-1 border-b pb-3 last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono">{e.ref}</span>
              <span className="font-mono text-xs text-muted-foreground">{e.date}</span>
              <span className="font-medium">{e.label}</span>
              {e.reversedBy && <ToneBadge tone="neutral">Reversed by {e.reversedBy}</ToneBadge>}
            </span>
            {canWrite && !e.reversedBy && !e.reversalOf && (
              <ReasonDialog
                action={reverseEntry}
                hidden={{ id: e.id }}
                trigger="Reverse"
                title={`Reverse ${e.ref}?`}
                description="A second entry on today's date undoes every amount; both stay in the journal."
                confirmLabel="Reverse it"
              />
            )}
          </div>
          <table className="text-sm" aria-label={`Lines of ${e.ref}`}>
            <tbody>
              {e.lines.map((l, i) => (
                <tr key={i}>
                  <td className="w-24 font-mono">{l.account}</td>
                  <td className="text-muted-foreground">
                    {l.label ?? accountName(l.account, chart)}
                  </td>
                  <td className="w-28 text-right tabular-nums">
                    {l.cents > 0 ? formatCents(l.cents) : ""}
                  </td>
                  <td className="w-28 text-right tabular-nums">
                    {l.cents < 0 ? formatCents(-l.cents) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </li>
      ))}
    </ul>
  );
}
