import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { DocumentActions, DocumentBody } from "@/features/accounting/components/document-parts";
import { InvoicePayments } from "@/features/accounting/components/invoice-payments";
import { InvoiceStatusLine } from "@/features/accounting/components/invoice-status-line";
import {
  getInvoice,
  invoiceSettlement,
  paymentsOfInvoice,
  paymentTerms,
} from "@/features/accounting/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Invoice" };

/** A sales invoice, a credit note or a supplier bill: one screen, the parts decide by kind. */
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
  const today = officeToday();
  const draftTitle = `${i.kind === "bill" ? "Bill from" : "Draft for"} ${inv.customer.name}`;

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{i.number ?? draftTitle}</span>}
        description={
          <InvoiceStatusLine
            kind={i.kind}
            status={i.status}
            reason={i.reason}
            credits={inv.credits}
          />
        }
        actions={
          <DocumentActions
            inv={inv}
            terms={terms}
            today={today}
            can={{
              issue: can(user.role, "accounting.issue"),
              approve: can(user.role, "accounting.approve"),
            }}
          />
        }
      />
      <Card>
        <CardContent className="grid gap-6 pt-4">
          <DocumentBody
            inv={inv}
            editable={i.status === "draft" && can(user.role, "accounting.issue")}
          />
        </CardContent>
      </Card>
      {i.status === "issued" && i.kind !== "credit" && (
        <InvoicePayments
          invoiceId={i.id}
          grossCents={i.grossCents ?? 0}
          dueDate={i.dueDate}
          money={money}
          payments={paid}
          today={today}
          canPay={can(user.role, "accounting.bank")}
        />
      )}
    </>
  );
}
