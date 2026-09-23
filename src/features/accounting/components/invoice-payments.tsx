import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCents } from "@/domain/money";
import { openCents, payState } from "@/domain/payments";
import type { paymentsOfInvoice } from "../queries";
import { PayStateBadge } from "./pay-state-badge";
import { PaymentHistory } from "./payment-history";
import { RegisterPayment } from "./register-payment";

type Props = {
  invoiceId: string;
  grossCents: number;
  dueDate: string | null;
  money: { settled: number; credited: number };
  payments: Awaited<ReturnType<typeof paymentsOfInvoice>>;
  today: string;
  canPay: boolean;
};

/** An issued invoice's money: its state, what is open, its payments, and a way to pay it. */
export function InvoicePayments({
  invoiceId,
  grossCents,
  dueDate,
  money,
  payments,
  today,
  canPay,
}: Props) {
  const open = openCents(grossCents, money.settled, money.credited);
  const state = payState({
    grossCents,
    settledCents: money.settled,
    creditedCents: money.credited,
    dueDate,
    today,
  });
  return (
    <Card className="mt-4">
      <CardHeader>
        {/* A real h2: the page h1 is the invoice number, this is a section under it. */}
        <h2 className="flex flex-wrap items-center gap-2 font-heading text-base font-medium">
          Payments <PayStateBadge state={state} />
          <span className="text-sm font-normal text-muted-foreground">
            {formatCents(open)} open of {formatCents(grossCents)}
          </span>
        </h2>
      </CardHeader>
      <CardContent className="grid gap-4">
        <PaymentHistory rows={payments} canReverse={canPay} />
        {open > 0 && canPay && (
          <RegisterPayment invoiceId={invoiceId} openCents={open} today={today} />
        )}
      </CardContent>
    </Card>
  );
}
