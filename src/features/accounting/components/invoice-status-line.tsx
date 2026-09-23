import Link from "next/link";
import type { InvoiceKind, InvoiceStatus } from "@/domain/invoicing";
import { InvoiceBadge } from "./invoice-badge";

/** Under the invoice's number: its state, who credited it, why a draft was discarded. */
export function InvoiceStatusLine(p: {
  kind: InvoiceKind;
  status: InvoiceStatus;
  reason: string | null;
  credits: { id: string; number: string | null; status: InvoiceStatus }[];
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <InvoiceBadge kind={p.kind} status={p.status} />
      {p.credits
        .filter((c) => c.status === "issued")
        .map((c) => (
          <Link
            key={c.id}
            className="font-mono hover:underline"
            href={`/accounting/invoices/${c.id}`}
          >
            credited by {c.number}
          </Link>
        ))}
      {p.status === "discarded" && p.reason && <span>— {p.reason}</span>}
    </span>
  );
}
