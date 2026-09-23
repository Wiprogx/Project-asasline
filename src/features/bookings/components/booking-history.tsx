import type { bookingHistory } from "../queries";

type Row = Awaited<ReturnType<typeof bookingHistory>>[number];

const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Brussels",
  dateStyle: "short",
  timeStyle: "short",
});

const LABEL: Record<string, (d: Record<string, unknown>) => string> = {
  "booking.create": (d) => `Created ${d.ref ?? ""}`,
  "booking.status": (d) => `Status → ${d.status}`,
  "booking.edit": (d) => `Edited ${(d.fields as string[] | undefined)?.join(", ") ?? ""}`,
  "booking.cancel": (d) => `Cancelled — ${d.reason}`,
  "booking.restore": () => "Put back",
  "container.add": (d) => `Container added (${d.type})`,
  "container.edit": (d) => `Container saved${d.number ? ` · ${d.number}` : ""}`,
  "container.remove": (d) => `Container removed — ${d.reason}`,
};

/** The booking's own audit trail in plain words (legacy "hist" tab). */
export function BookingHistory({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ol className="grid gap-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="grid grid-cols-[9rem_1fr] gap-3 border-b pb-2 text-sm last:border-0"
        >
          <span className="font-mono text-xs text-muted-foreground">{stamp.format(r.at)}</span>
          <span>
            {(LABEL[r.action] ?? (() => r.action))(r.detail ?? {})}
            <span className="text-muted-foreground"> · {r.who ?? "unknown"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
