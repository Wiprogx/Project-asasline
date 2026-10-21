import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BILL_STATUS_LABEL } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import { may } from "@/domain/permissions";
import { BillingPanel } from "@/features/accounting/components/billing-panel";
import { BookingInvoices } from "@/features/accounting/components/booking-invoices";
import { bookingBilling } from "@/features/accounting/queries";
import { bookingTermGate } from "@/features/accounting/term-queries";
import { NewBillForm } from "@/features/accounting/components/bill-controls";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Billing" };

const TONE = {
  none: "neutral",
  not: "neutral",
  partly: "warning",
  done: "success",
  over: "danger",
} as const;

/** The booking's invoicing (legacy "Invoicing" tab): the route composes Bookings and Accounting. */
export default async function BookingBillingPage({ params }: PageProps<"/bookings/[id]/billing">) {
  const user = await requirePagePermission("app.accounting");
  const id = (await params).id;
  const [billing, suppliers, gate] = await Promise.all([
    bookingBilling(id),
    contactOptions(),
    bookingTermGate(id),
  ]);
  if (!billing) notFound();
  const { booking: b } = billing;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ToneBadge tone={TONE[billing.status]}>{BILL_STATUS_LABEL[billing.status]}</ToneBadge>
            <span className="text-sm font-normal text-muted-foreground">
              {formatCents(billing.billedCents)} of {formatCents(billing.totalCents)} net · costs{" "}
              {formatCents(billing.costCents)} · margin{" "}
              {formatCents(billing.billedCents - billing.costCents)}
            </span>
          </CardTitle>
          {gate && (
            <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
              Payment terms: <b>{gate.term}</b> — payment is expected {gate.when}
              {gate.unpaid ? " · still unpaid" : ""}.
            </p>
          )}
          <CardDescription className="flex flex-wrap items-center justify-between gap-2">
            Lines come from the quotation; credit notes give their quantities back.
            {may(user, "accounting.issue") && (
              <NewBillForm suppliers={suppliers} bookingId={b.id} />
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {may(user, "accounting.issue") && b.status !== "cancelled" ? (
            <BillingPanel
              bookingId={b.id}
              lines={billing.lines}
              parties={billing.parties}
              defaultPayer={b.payerId ?? b.clientId}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {b.status === "cancelled"
                ? "A cancelled booking is not invoiced."
                : "You can see, not issue, invoices."}
            </p>
          )}
        </CardContent>
      </Card>
      <BookingInvoices rows={billing.invoices} />
    </div>
  );
}
