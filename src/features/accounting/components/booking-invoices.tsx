import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/domain/money";
import { InvoiceBadge } from "./invoice-badge";

type Row = {
  id: string;
  kind: "invoice" | "credit" | "bill";
  status: "draft" | "issued" | "discarded";
  number: string | null;
  grossCents: number | null;
  customer: string;
};

/** The invoices and credit notes on a booking, each with its state (the Invoicing tab). */
export function BookingInvoices({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices on this booking</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {rows.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link href={`/accounting/invoices/${i.id}`} className="font-mono hover:underline">
                {i.number ?? "draft"}
              </Link>
              <span className="text-muted-foreground">{i.customer}</span>
              <span className="tabular-nums">
                {i.kind === "credit" ? "−" : ""}
                {formatCents(i.grossCents)}
              </span>
              <InvoiceBadge kind={i.kind} status={i.status} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
