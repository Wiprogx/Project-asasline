import { type AuditLabels, type AuditRow, AuditTrail } from "@/components/shared/audit-trail";
import { type Changes, describeChanges } from "@/domain/changes";

/** The contact form's words for its fields, so a change reads as the screen says it. */
const FIELD: Record<string, string> = {
  name: "Name",
  type: "Type",
  kind: "Customer / Supplier",
  lang: "Language",
  professions: "Industries",
  tags: "Tags",
  note: "Note",
  email: "Email",
  phone: "Phone",
  mobile: "Mobile",
  whatsapp: "WhatsApp",
  vat: "VAT number",
  eori: "EORI",
  street: "Street",
  zip: "Postcode",
  city: "City",
  country: "Country",
  website: "Website",
  creditLimitCents: "Credit limit (cents)",
  usesLastPrice: "Last price",
  paymentTermId: "Payment terms",
};

const edited = (d: Record<string, unknown>) => {
  const said = d.changes ? describeChanges(d.changes as Changes, FIELD) : "";
  return said ? `Edited — ${said}` : "Edited";
};

const LABEL: AuditLabels = {
  "contact.create": () => "Created",
  "contact.update": edited,
  "contact.archive": (d) => `Archived — ${d.reason ?? ""}`,
  "contact.restore": () => "Put back",
  "contact.address.add": (d) => `${d.type ?? "Address"} added`,
  "contact.address.edit": (d) => `${d.type ?? "Address"} edited`,
  "contact.address.archive": (d) => `Address removed — ${d.reason ?? ""}`,
  "contact.bank.add": () => "Bank account added",
  "contact.file.add": (d) => `${d.kind ?? "Paper"} kept — ${d.name ?? ""}`,
  "contact.file.remove": (d) => `Paper taken off — ${d.reason ?? ""}`,
  "contact.bank.archive": (d) => `Bank account removed — ${d.reason ?? ""}`,
  "contact.idChecked": (d) =>
    `${String(d.kind ?? "Number").toUpperCase()} ${d.value ?? ""} checked`,
};

/** The contact's own audit trail in plain words, with what each edit changed (legacy history tab). */
export function ContactHistory({ rows }: { rows: AuditRow[] }) {
  return <AuditTrail rows={rows} labels={LABEL} />;
}
