import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { defaultSaleVat } from "@/domain/accounting";
import { can } from "@/domain/permissions";
import { AddLineForm, RemoveLine } from "@/features/accounting/components/draft-editor";
import { InvoiceActions } from "@/features/accounting/components/invoice-actions";
import { InvoiceBadge } from "@/features/accounting/components/invoice-badge";
import { InvoiceView } from "@/features/accounting/components/invoice-view";
import { PayStateBadge } from "@/features/accounting/components/pay-state-badge";
import { PaymentHistory } from "@/features/accounting/components/payment-history";
import { RegisterPayment } from "@/features/accounting/components/register-payment";
import {
  getInvoice,
  invoiceSettlement,
  paymentsOfInvoice,
  paymentTerms,
} from "@/features/accounting/queries";
import { formatCents } from "@/domain/money";
import { openCents, payState } from "@/domain/payments";
import { officeToday } from "@/server/clock";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/accounting/invoices/[id]">) {
  const user = await requirePagePermission("app.accounting");
  const { id } = await params;
  const [inv, terms, money, paid] = await Promise.all([
    getInvoice(id),
    paymentTerms(),
    invoiceSettlement(id),
    paymentsOfInvoice(id),
  ]);
  if (!inv) notFound();
  const i = inv.invoice;
  const editable = i.status === "draft" && can(user.role, "accounting.issue");
  const credited = inv.credits.some((c) => c.status === "issued");
  const today = officeToday();
  const payable = i.status === "issued" && i.kind === "invoice";
  const open = openCents(i.grossCents ?? 0, money.settled, money.credited);
  const state = payState({
    grossCents: i.grossCents ?? 0,
    settledCents: money.settled,
    creditedCents: money.credited,
    dueDate: i.dueDate,
    today,
  });

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{i.number ?? `Draft for ${inv.customer.name}`}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <InvoiceBadge kind={i.kind} status={i.status} />
            {credited &&
              inv.credits.map((c) => (
                <Link
                  key={c.id}
                  className="font-mono hover:underline"
                  href={`/accounting/invoices/${c.id}`}
                >
                  credited by {c.number}
                </Link>
              ))}
            {i.status === "discarded" && i.reason && <span>— {i.reason}</span>}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {i.status === "issued" && (
              <Button
                variant="outline"
                render={<Link href={`/print/invoices/${i.id}`} target="_blank" />}
              >
                Print / PDF
              </Button>
            )}
            {can(user.role, "accounting.issue") && (
              <InvoiceActions
                id={i.id}
                version={i.version}
                status={i.status}
                kind={i.kind}
                credited={credited}
                termId={i.paymentTermId}
                terms={terms}
              />
            )}
          </div>
        }
      />
      <Card>
        <CardContent className="grid gap-6 pt-4">
          <InvoiceView
            inv={inv}
            lineAction={
              editable
                ? (lineId) => <RemoveLine id={i.id} version={i.version} lineId={lineId} />
                : undefined
            }
          />
          {editable && (
            <AddLineForm
              id={i.id}
              version={i.version}
              defaultVat={defaultSaleVat(inv.customer.country)}
            />
          )}
        </CardContent>
      </Card>
      {payable && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Payments <PayStateBadge state={state} />
              <span className="text-sm font-normal text-muted-foreground">
                {formatCents(open)} open of {formatCents(i.grossCents)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <PaymentHistory rows={paid} canReverse={can(user.role, "accounting.bank")} />
            {open > 0 && can(user.role, "accounting.bank") && (
              <RegisterPayment invoiceId={i.id} openCents={open} today={today} />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
