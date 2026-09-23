import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { defaultSaleVat } from "@/domain/accounting";
import { can } from "@/domain/permissions";
import { AddLineForm, RemoveLine } from "@/features/accounting/components/draft-editor";
import { InvoiceActions } from "@/features/accounting/components/invoice-actions";
import { InvoiceStatusLine } from "@/features/accounting/components/invoice-status-line";
import { InvoicePayments } from "@/features/accounting/components/invoice-payments";
import { InvoiceView } from "@/features/accounting/components/invoice-view";
import {
  getInvoice,
  invoiceSettlement,
  paymentsOfInvoice,
  paymentTerms,
} from "@/features/accounting/queries";
import { officeToday } from "@/server/clock";
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
  const payable = i.status === "issued" && i.kind === "invoice";

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{i.number ?? `Draft for ${inv.customer.name}`}</span>}
        description={
          <InvoiceStatusLine
            kind={i.kind}
            status={i.status}
            reason={i.reason}
            credits={inv.credits}
          />
        }
        actions={
          <InvoiceActions
            id={i.id}
            version={i.version}
            status={i.status}
            kind={i.kind}
            credited={inv.credits.some((c) => c.status === "issued")}
            termId={i.paymentTermId}
            terms={terms}
            canIssue={can(user.role, "accounting.issue")}
          />
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
        <InvoicePayments
          invoiceId={i.id}
          grossCents={i.grossCents ?? 0}
          dueDate={i.dueDate}
          money={money}
          payments={paid}
          today={officeToday()}
          canPay={can(user.role, "accounting.bank")}
        />
      )}
    </>
  );
}
