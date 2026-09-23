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
import type { QuotationRow } from "../queries";
import { QUOTATION_TONE } from "../status";

export function QuotationsTable({ rows }: { rows: QuotationRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No quotations match.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ref</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="hidden md:table-cell">Valid until</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((q) => (
          <TableRow key={q.id}>
            <TableCell>
              <Link href={`/quotations/${q.id}`} className="font-mono font-medium hover:underline">
                {q.ref}
              </Link>
            </TableCell>
            <TableCell className="max-w-48 truncate">{q.clientName}</TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">
              {q.validUntil ?? "—"}
            </TableCell>
            <TableCell>
              <ToneBadge tone={QUOTATION_TONE[q.status][1]}>
                {QUOTATION_TONE[q.status][0]}
              </ToneBadge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
