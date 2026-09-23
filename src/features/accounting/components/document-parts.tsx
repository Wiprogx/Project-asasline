import { defaultSaleVat, needsApproval, PURCHASE_ACCOUNTS } from "@/domain/accounting";
import { addDays } from "@/domain/dates";
import type { getInvoice } from "../queries";
import { BillActions } from "./bill-controls";
import { AddLineForm, RemoveLine } from "./draft-editor";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceView } from "./invoice-view";

type Doc = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;
type Term = { id: string; name: string };

/** The header's actions: a sales invoice is issued or credited; a supplier bill recorded or approved. */
export function DocumentActions({
  inv,
  terms,
  today,
  can,
}: {
  inv: Doc;
  terms: Term[];
  today: string;
  can: { issue: boolean; approve: boolean };
}) {
  const i = inv.invoice;
  if (i.kind === "bill")
    return (
      <BillActions
        id={i.id}
        version={i.version}
        status={i.status}
        needsApproval={needsApproval(i.grossCents ?? 0)}
        approved={!!i.approvedAt}
        canIssue={can.issue}
        canApprove={can.approve}
        billDate={i.issueDate ?? today}
        due={i.dueDate ?? addDays(i.issueDate ?? today, 30)}
        supplierRef={i.supplierRef}
      />
    );
  return (
    <InvoiceActions
      id={i.id}
      version={i.version}
      status={i.status}
      kind={i.kind}
      credited={inv.credits.some((c) => c.status === "issued")}
      termId={i.paymentTermId}
      terms={terms}
      canIssue={can.issue}
    />
  );
}

/** The document's lines; on a draft, lines can be removed and added (with a cost account on a bill). */
export function DocumentBody({ inv, editable }: { inv: Doc; editable: boolean }) {
  const i = inv.invoice;
  const bill = i.kind === "bill";
  const costAccount = i.bookingId ? "604000" : "619000";
  return (
    <>
      {bill && i.note && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {i.note}
        </p>
      )}
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
          defaultVat={bill ? "S21" : defaultSaleVat(inv.customer.country)}
          accounts={
            bill
              ? PURCHASE_ACCOUNTS.map((a) => ({ ...a, default: a.account === costAccount }))
              : undefined
          }
        />
      )}
    </>
  );
}
