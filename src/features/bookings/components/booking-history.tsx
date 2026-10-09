import { type AuditLabels, type AuditRow, AuditTrail } from "@/components/shared/audit-trail";

const LABEL: AuditLabels = {
  "booking.create": (d) => `Created ${d.ref ?? ""}`,
  "booking.status": (d) => `Status → ${d.status}`,
  "booking.edit": (d) => `Edited ${(d.fields as string[] | undefined)?.join(", ") ?? ""}`,
  "booking.cancel": (d) => `Cancelled — ${d.reason}`,
  "booking.restore": () => "Put back",
  "container.add": (d) => `Container added (${d.type})`,
  "container.edit": (d) => `Container saved${d.number ? ` · ${d.number}` : ""}`,
  "container.remove": (d) => `Container removed — ${d.reason}`,
  "rules.sync": (d) => {
    const opened = (d.opened as string[] | undefined) ?? [];
    const parts = [
      opened.length && `opened ${opened.join(", ")}`,
      d.redated && `${d.redated} redated`,
      d.withdrawn && `${d.withdrawn} withdrawn`,
    ].filter(Boolean);
    return `Document chain updated — ${parts.join(" · ")}`;
  },
};

/** The booking's own audit trail in plain words (legacy "hist" tab). */
export function BookingHistory({ rows }: { rows: AuditRow[] }) {
  return <AuditTrail rows={rows} labels={LABEL} />;
}
