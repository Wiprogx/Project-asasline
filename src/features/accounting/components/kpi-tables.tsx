import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KpiHead, MarginRow } from "@/domain/kpis";
import { formatCents } from "@/domain/money";
import { cn } from "@/lib/utils";

const num = "text-right tabular-nums";

/** The three figures at the top (legacy vKpi). */
export function KpiHeadCard({ head }: { head: KpiHead }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Invoiced in the period</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCents(head.revenueCents)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Customers owe us today</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCents(head.openArCents)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Days to get paid (DSO, last 90 days)</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {head.dso === null ? "—" : `${head.dso} days`}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

/** Margin by one key: shipments, invoiced, cost, margin and its percent. */
export function MarginByTable({ title, rows }: { title: string; rows: MarginRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing invoiced in the period.</p>
        ) : (
          <Table aria-label={title}>
            <TableHeader>
              <TableRow>
                <TableHead>{title.replace(/^Margin per /, "")}</TableHead>
                <TableHead className={num}>Shipments</TableHead>
                <TableHead className={num}>Invoiced</TableHead>
                <TableHead className={num}>Cost</TableHead>
                <TableHead className={num}>Margin</TableHead>
                <TableHead className={num}>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="max-w-56 truncate">{r.key}</TableCell>
                  <TableCell className={num}>{r.shipments}</TableCell>
                  <TableCell className={num}>{formatCents(r.revenueCents)}</TableCell>
                  <TableCell className={num}>{formatCents(r.costCents)}</TableCell>
                  <TableCell className={cn(num, r.marginCents < 0 && "text-destructive")}>
                    {formatCents(r.marginCents)}
                  </TableCell>
                  <TableCell className={num}>{r.pct === null ? "—" : `${r.pct}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
