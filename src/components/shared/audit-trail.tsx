import { formatStamp } from "@/lib/stamp";

export type AuditRow = {
  id: string | number;
  at: Date;
  action: string;
  detail: unknown;
  who: string | null;
};

/** What an action is called in plain words, from its audit detail. */
export type AuditLabels = Record<string, (d: Record<string, unknown>) => string>;

/** A record's own audit trail in plain words (legacy "hist" tab); an action with no words shows its code. */
export function AuditTrail({ rows, labels }: { rows: AuditRow[]; labels: AuditLabels }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ol className="grid gap-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="grid grid-cols-[9rem_1fr] gap-3 border-b pb-2 text-sm last:border-0"
        >
          <span className="font-mono text-xs text-muted-foreground">{formatStamp(r.at)}</span>
          <span>
            {(labels[r.action] ?? (() => r.action))((r.detail as Record<string, unknown>) ?? {})}
            <span className="text-muted-foreground"> · {r.who ?? "unknown"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
