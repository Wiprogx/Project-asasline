import { type AuditLabels, type AuditRow, AuditTrail } from "@/components/shared/audit-trail";

const text = (v: unknown) => (typeof v === "string" && v ? v : null);

const LABEL: AuditLabels = {
  "quotation.create": (d) => `Created ${text(d.ref) ?? ""}`.trim(),
  "quotation.send": (d) =>
    `Sent${text(d.via) ? ` by ${d.via}` : ""}${text(d.to) ? ` to ${d.to}` : ""}`,
  "quotation.accept": (d) => `Accepted${text(d.bookingRef) ? ` — booking ${d.bookingRef}` : ""}`,
  "quotation.route.add": (d) => `Destination added${text(d.pod) ? ` · ${d.pod}` : ""}`,
  "quotation.route.update": () => "Destination edited",
  "quotation.route.decline": (d) => `Destination declined${text(d.reason) ? ` — ${d.reason}` : ""}`,
  "quotation.route.restore": () => "Destination put back",
  "quotation.line.add": (d) => `Line added${text(d.description) ? ` · ${d.description}` : ""}`,
  "quotation.line.update": () => "Line edited",
  "quotation.line.remove": (d) => `Line removed${text(d.reason) ? ` — ${d.reason}` : ""}`,
};

/** The quotation's own audit trail in plain words (legacy quotation History tab). */
export function QuotationHistory({ rows }: { rows: AuditRow[] }) {
  return <AuditTrail rows={rows} labels={LABEL} />;
}
