import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { RATE_TYPE_LABEL } from "@/domain/pricing";
import type { listRateItems } from "../queries";

type Row = Awaited<ReturnType<typeof listRateItems>>[number];

/** The catalogue: what we sell, what it costs us, and until when the rate holds. */
export function RateItemsTable({
  rows,
  categories,
  today,
}: {
  rows: Row[];
  categories: { code: string; label: string }[];
  today: string;
}) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">No item here.</p>;
  const label = (code: string) => categories.find((c) => c.code === code)?.label ?? code;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Valid until</TableHead>
          <TableHead className="text-right">Sell</TableHead>
          <TableHead className="text-right">Buy</TableHead>
          <TableHead className="text-right">Margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((it) => (
          <TableRow key={it.id}>
            <TableCell>
              <Link className="font-medium hover:underline" href={`/settings/catalogue/${it.id}`}>
                {it.label}
              </Link>
            </TableCell>
            <TableCell>{label(it.category)}</TableCell>
            <TableCell>{RATE_TYPE_LABEL[it.rateType]}</TableCell>
            <TableCell className="font-mono text-xs">
              {it.validUntil && it.validUntil < today ? (
                <ToneBadge tone="danger">expired {it.validUntil}</ToneBadge>
              ) : (
                (it.validUntil ?? "—")
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(it.sellCents)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(it.buyCents)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCents(it.sellCents - it.buyCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
