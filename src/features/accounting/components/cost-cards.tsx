import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { varianceWords } from "@/domain/cost";
import { formatCents } from "@/domain/money";
import type { bookingCost } from "../cost-queries";

type Cost = NonNullable<Awaited<ReturnType<typeof bookingCost>>>;

const Line = ({ k, v, strong }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean }) => (
  <div
    className={`flex items-center justify-between gap-2 py-1 text-sm ${strong ? "font-medium" : ""}`}
  >
    <span className={strong ? "" : "text-muted-foreground"}>{k}</span>
    <span className="tabular-nums">{v}</span>
  </div>
);

/** Expected (from the quotation) vs recorded (the supplier bills) vs the profit (legacy Cost & margin). */
export function CostCards({ cost }: { cost: Cost }) {
  const { booking: b, expectedLines, bills, summary: s } = cost;
  const variance = varianceWords(s.varianceCents, formatCents);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Expected — from the quotation</CardTitle>
          <CardDescription>
            {b.quotationRef ? (
              <>
                Read from{" "}
                <Link href={`/quotations/${b.quotationId}`} className="font-mono hover:underline">
                  {b.quotationRef}
                </Link>{" "}
                — change a price there and this follows.
              </>
            ) : (
              "This booking was not made from a quotation, so there is nothing to expect — the recorded bills are the cost."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expectedLines.map((l, i) => (
            <Line
              key={i}
              k={`${l.description} · ${l.qty} × ${formatCents(l.costCents)}`}
              v={formatCents(l.qty * l.costCents)}
            />
          ))}
          {s.expectedCents !== null && (
            <Line k="Expected cost" v={formatCents(s.expectedCents)} strong />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recorded — what we have been billed</CardTitle>
          <CardDescription>
            Supplier bills recorded against this booking, net of VAT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bills.length === 0 && (
            <p className="text-sm text-muted-foreground">No purchase invoice recorded yet.</p>
          )}
          {bills.map((x) => (
            <Line
              key={x.id}
              k={
                <Link href={`/accounting/invoices/${x.id}`} className="hover:underline">
                  {x.supplier} · {x.supplierRef ?? x.number ?? "bill"}
                  {x.issueDate ? ` · ${x.issueDate}` : ""}
                </Link>
              }
              v={formatCents(x.netCents)}
            />
          ))}
          <Line k="Recorded so far" v={formatCents(s.recordedCents)} strong />
          <Line
            k="Against expected"
            v={<ToneBadge tone={variance.tone}>{variance.text}</ToneBadge>}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Profit</CardTitle>
          <CardDescription>
            Revenue is the destination sold; the cost is the expected one when quoted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Line k="Total revenue" v={formatCents(s.revenueCents)} />
          <Line k="Total cost" v={formatCents(s.expectedCents ?? s.recordedCents)} />
          <Line
            k="Profit"
            v={
              <span className={s.profitCents < 0 ? "text-destructive" : "text-success"}>
                {formatCents(s.profitCents)}
              </span>
            }
            strong
          />
          <Line k="Margin" v={`${s.marginPct.toFixed(1)}%`} />
          {s.expectedCents !== null && s.recordedCents > 0 && (
            <Line k="On the bills recorded" v={formatCents(s.profitRecordedCents)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
