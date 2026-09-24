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
import { listIsLive } from "@/domain/pricing";
import type { listPriceLists } from "../queries";

type Row = Awaited<ReturnType<typeof listPriceLists>>[number];

export function PriceListsTable({ rows, today }: { rows: Row[]; today: string }) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">No agreement yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agreement</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>From</TableHead>
          <TableHead>Until</TableHead>
          <TableHead>Today</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ list: l, contact }) => (
          <TableRow key={l.id}>
            <TableCell>
              <Link className="font-medium hover:underline" href={`/settings/price-lists/${l.id}`}>
                {l.name}
              </Link>
            </TableCell>
            <TableCell>{contact}</TableCell>
            <TableCell className="font-mono text-xs">{l.validFrom ?? "—"}</TableCell>
            <TableCell className="font-mono text-xs">{l.validUntil ?? "open"}</TableCell>
            <TableCell>
              {listIsLive(l, today) ? (
                <ToneBadge tone="success">In force</ToneBadge>
              ) : (
                <ToneBadge tone="neutral">{l.active ? "Not in force" : "Switched off"}</ToneBadge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
