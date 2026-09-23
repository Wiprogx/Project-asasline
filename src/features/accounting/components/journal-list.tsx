import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { accountName, type Entry } from "@/domain/ledger";
import { formatCents } from "@/domain/money";
import type { Period } from "@/domain/period";
import { AccountLink } from "./report-tables";

const num = "text-right tabular-nums";

const SOURCE_PAGE = {
  payment: "/accounting/payments",
  asset: "/accounting/assets",
  accrual: "/accounting/accruals",
} as const;

/** Where an entry comes from: its document, or the screen that made it. */
export function sourceHref(e: Entry) {
  return e.source.kind === "invoice"
    ? `/accounting/invoices/${e.source.id}`
    : SOURCE_PAGE[e.source.kind];
}

/** The journal as the accountant reads it: one block per entry, debit and credit columns. */
export function JournalList({ entries, period }: { entries: Entry[]; period: Period }) {
  if (entries.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing booked in this period.
      </p>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Journal</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Label</TableHead>
          <TableHead className={num}>Debit</TableHead>
          <TableHead className={num}>Credit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => [
          <TableRow key={`${e.source.id}-${e.ref}`} className="bg-muted/40">
            <TableCell className="font-mono text-xs">{e.date}</TableCell>
            <TableCell className="font-mono text-xs">{e.journal}</TableCell>
            <TableCell colSpan={4}>
              <Link className="font-mono hover:underline" href={sourceHref(e)}>
                {e.ref}
              </Link>{" "}
              <span className="text-muted-foreground">{e.label}</span>
            </TableCell>
          </TableRow>,
          ...e.lines.map((l, i) => (
            <TableRow key={`${e.source.id}-${e.ref}-${i}`}>
              <TableCell colSpan={2} />
              <TableCell>
                <AccountLink account={l.account} period={period} />{" "}
                <span className="text-muted-foreground">{accountName(l.account)}</span>
              </TableCell>
              <TableCell className="max-w-48 truncate">{l.label}</TableCell>
              <TableCell className={num}>{l.cents > 0 ? formatCents(l.cents) : ""}</TableCell>
              <TableCell className={num}>{l.cents < 0 ? formatCents(-l.cents) : ""}</TableCell>
            </TableRow>
          )),
        ])}
      </TableBody>
    </Table>
  );
}
