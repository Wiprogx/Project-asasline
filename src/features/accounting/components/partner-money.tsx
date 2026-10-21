import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PartnerBalance } from "@/domain/partner-balance";
import { formatCents } from "@/domain/money";

type Payment = {
  id: string;
  date: string;
  direction: "in" | "out";
  amountCents: number;
  status: "posted" | "reversed";
  reference: string | null;
};

function Row({ label, cents, tone }: { label: string; cents: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${tone ?? ""}`}>{formatCents(cents)}</span>
    </div>
  );
}

/** Where the office stands with the contact, and its payments (legacy contact Invoices tab). */
export function PartnerMoney({
  balance: b,
  payments,
}: {
  balance: PartnerBalance;
  payments: Payment[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Row
            label="They owe us"
            cents={b.theyOweCents}
            tone={b.theyOweCents ? "text-amber-700 dark:text-amber-400" : ""}
          />
          {b.overdueCount > 0 && (
            <Row
              label={`of which overdue (${b.overdueCount})`}
              cents={b.overdueCents}
              tone="text-destructive"
            />
          )}
          <Row label="We owe them" cents={b.weOweCents} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment yet.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href="/accounting/payments" className="font-mono text-xs hover:underline">
                    {p.date}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {p.reference ?? "—"}
                  </span>
                  {p.status === "reversed" && <ToneBadge tone="neutral">Reversed</ToneBadge>}
                  <span className={`tabular-nums ${p.status === "reversed" ? "line-through" : ""}`}>
                    {p.direction === "in" ? "+" : "−"}
                    {formatCents(p.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
