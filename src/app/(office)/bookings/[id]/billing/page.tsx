import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BILL_STATUS_LABEL } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import { can } from "@/domain/permissions";
import { BillingPanel } from "@/features/accounting/components/billing-panel";
import { InvoiceBadge } from "@/features/accounting/components/invoice-badge";
import { bookingBilling } from "@/features/accounting/queries";
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
  const billing = await bookingBilling((await params).id);
  if (!billing) notFound();
  const { booking: b } = billing;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ToneBadge tone={TONE[billing.status]}>{BILL_STATUS_LABEL[billing.status]}</ToneBadge>
            <span className="text-sm font-normal text-muted-foreground">
              {formatCents(billing.billedCents)} of {formatCents(billing.totalCents)} net
            </span>
          </CardTitle>
          <CardDescription>
            Lines come from the quotation; credit notes give their quantities back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {can(user.role, "accounting.issue") && b.status !== "cancelled" ? (
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
      {billing.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoices on this booking</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {billing.invoices.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
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
      )}
    </div>
  );
}
