import { ToneBadge } from "@/components/shared/tone-badge";
import type { InvoiceKind, InvoiceStatus } from "@/domain/invoicing";

export function InvoiceBadge({ kind, status }: { kind: InvoiceKind; status: InvoiceStatus }) {
  if (status === "draft") return <ToneBadge tone="neutral">Draft</ToneBadge>;
  if (status === "discarded") return <ToneBadge tone="neutral">Discarded</ToneBadge>;
  return kind === "credit" ? (
    <ToneBadge tone="info">Credit note</ToneBadge>
  ) : (
    <ToneBadge tone="warning">Issued</ToneBadge>
  );
}
