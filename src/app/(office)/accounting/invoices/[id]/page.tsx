import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { may } from "@/domain/permissions";
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
import { invoiceAttachments } from "@/features/accounting/file-queries";
import { InvoiceFiles } from "@/features/accounting/components/invoice-files";
import { peppolProblems, peppolState } from "@/domain/peppol";
import { PeppolBadge } from "@/features/accounting/components/peppol-badge";
import { PeppolSentButton } from "@/features/accounting/components/peppol-controls";

export const metadata: Metadata = { title: "Invoice" };

/** A sales invoice, a credit note or a supplier bill: one screen, the parts decide by kind. */
export default async function InvoicePage({ params }: PageProps<"/accounting/invoices/[id]">) {
  const user = await requirePagePermission("app.accounting");
  const { id } = await params;
  const [inv, terms, money, paid, files] = await Promise.all([
    getInvoice(id),
    paymentTerms(),
    invoiceSettlement(id),
    paymentsOfInvoice(id),
    invoiceAttachments(id),
  ]);
  if (!inv) notFound();
  const i = inv.invoice;
  const today = officeToday();
  const peppol = peppolState(i, peppolProblems(inv.customer).length);
  const draftTitle = `${i.kind === "bill" ? "Bill from" : "Draft for"} ${inv.customer.name}`;

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{i.number ?? draftTitle}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <InvoiceStatusLine
              kind={i.kind}
              status={i.status}
              reason={i.reason}
              credits={inv.credits}
            />
            <PeppolBadge
              state={peppol}
              sentOn={i.peppolSentAt ? officeToday(i.peppolSentAt) : null}
            />
          </span>
        }
        actions={
          <>
            <DocumentActions
              inv={inv}
              terms={terms}
              today={today}
              can={{
                issue: may(user, "accounting.issue"),
                approve: may(user, "accounting.approve"),
              }}
            />
            {peppol === "ready" && may(user, "accounting.issue") && <PeppolSentButton id={i.id} />}
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-6 pt-4">
          <DocumentBody
            inv={inv}
            editable={i.status === "draft" && may(user, "accounting.issue")}
          />
        </CardContent>
      </Card>
      <InvoiceFiles invoiceId={i.id} files={files} canEdit={may(user, "accounting.issue")} />
      {i.status === "issued" && i.kind !== "credit" && (
        <InvoicePayments
          invoiceId={i.id}
          grossCents={i.grossCents ?? 0}
          dueDate={i.dueDate}
          money={money}
          payments={paid}
          today={today}
          canPay={may(user, "accounting.bank")}
        />
      )}
    </>
  );
}
