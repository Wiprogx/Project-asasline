import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccountTotal, balanceSheet, profitAndLoss } from "@/domain/ledger";
import { formatCents } from "@/domain/money";
import type { Period } from "@/domain/period";

const num = "text-right tabular-nums";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">{title}</h2>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AccountLink({ account, period }: { account: string; period: Period }) {
  return (
    <Link
      className="font-mono hover:underline"
      href={`/accounting/ledger/${account}?from=${period.from}&to=${period.to}`}
    >
      {account}
    </Link>
  );
}

/** Every account that moved: before the period, debits and credits inside it, the close. */
export function TrialBalanceTable({ rows, period }: { rows: AccountTotal[]; period: Period }) {
  const sum = (k: "openCents" | "debitCents" | "creditCents" | "closeCents") =>
    rows.reduce((s, r) => s + r[k], 0);
  return (
    <Section title="Trial balance">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className={num}>Opening</TableHead>
            <TableHead className={num}>Debit</TableHead>
            <TableHead className={num}>Credit</TableHead>
            <TableHead className={num}>Closing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.account}>
              <TableCell>
                <AccountLink account={r.account} period={period} />
              </TableCell>
              <TableCell>{r.name || "—"}</TableCell>
              <TableCell className={num}>{formatCents(r.openCents)}</TableCell>
              <TableCell className={num}>{formatCents(r.debitCents)}</TableCell>
              <TableCell className={num}>{formatCents(r.creditCents)}</TableCell>
              <TableCell className={num}>{formatCents(r.closeCents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className={num}>{formatCents(sum("openCents"))}</TableCell>
            <TableCell className={num}>{formatCents(sum("debitCents"))}</TableCell>
            <TableCell className={num}>{formatCents(sum("creditCents"))}</TableCell>
            <TableCell className={num}>{formatCents(sum("closeCents"))}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Section>
  );
}

function Lines({
  rows,
  period,
}: {
  rows: { account: string; name: string; cents: number }[];
  period: Period;
}) {
  return rows.map((r) => (
    <TableRow key={r.account}>
      <TableCell>
        <AccountLink account={r.account} period={period} /> {r.name}
      </TableCell>
      <TableCell className={num}>{formatCents(r.cents)}</TableCell>
    </TableRow>
  ));
}

function Total({ label, cents }: { label: string; cents: number }) {
  return (
    <TableRow className="font-medium">
      <TableCell>{label}</TableCell>
      <TableCell className={num}>{formatCents(cents)}</TableCell>
    </TableRow>
  );
}

export function ProfitLossTable({
  pl,
  period,
}: {
  pl: ReturnType<typeof profitAndLoss>;
  period: Period;
}) {
  return (
    <Section title="Profit and loss">
      <Table>
        <TableBody>
          <Lines rows={pl.revenue} period={period} />
          <Total label="Revenue" cents={pl.revenueCents} />
          <Lines rows={pl.costs} period={period} />
          <Total label="Costs" cents={pl.costCents} />
        </TableBody>
        <TableFooter>
          <Total label={pl.resultCents >= 0 ? "Profit" : "Loss"} cents={pl.resultCents} />
        </TableFooter>
      </Table>
    </Section>
  );
}

export function BalanceSheetTable({
  bs,
  period,
}: {
  bs: ReturnType<typeof balanceSheet>;
  period: Period;
}) {
  const rows = (xs: AccountTotal[]) => xs.map((a) => ({ ...a, cents: a.closeCents }));
  return (
    <Section title={`Balance sheet at ${period.to}`}>
      <Table>
        <TableBody>
          <Lines rows={rows(bs.assets)} period={period} />
          <Total label="Assets" cents={bs.assetCents} />
          <Lines rows={rows(bs.liabilities)} period={period} />
          <TableRow>
            <TableCell>Result not yet brought forward</TableCell>
            <TableCell className={num}>{formatCents(bs.resultCents)}</TableCell>
          </TableRow>
          <Total label="Liabilities and equity" cents={bs.liabilityCents} />
        </TableBody>
      </Table>
    </Section>
  );
}
