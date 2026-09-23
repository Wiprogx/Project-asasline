import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { listPayments } from "@/features/accounting/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requirePagePermission("app.accounting");
  const rows = await listPayments();
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Payments"
        description="Money received, newest first; reversals stay in view."
      />
      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payment yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ payment: p, customer, invoiceId, invoiceNumber }) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.date}</TableCell>
                    <TableCell className="max-w-48 truncate">{customer ?? "—"}</TableCell>
                    <TableCell>
                      {invoiceId ? (
                        <Link
                          className="font-mono hover:underline"
                          href={`/accounting/invoices/${invoiceId}`}
                        >
                          {invoiceNumber}
                        </Link>
                      ) : (
                        "on account"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(p.amountCents)}
                    </TableCell>
                    <TableCell>
                      {p.status === "reversed" ? (
                        <ToneBadge tone="neutral">Reversed</ToneBadge>
                      ) : (
                        <ToneBadge tone="success">
                          {p.bankLineId ? "From the bank" : p.method}
                        </ToneBadge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
