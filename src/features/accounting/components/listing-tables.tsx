import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientRow, IntraRow } from "@/domain/listings";
import { formatCents } from "@/domain/money";

const num = "text-right tabular-nums";

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

export function ClientListingTable({ rows }: { rows: ClientRow[] }) {
  if (rows.length === 0) return <Empty text="No Belgian customer above €250 this year." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>VAT number</TableHead>
          <TableHead className={num}>Turnover</TableHead>
          <TableHead className={num}>VAT</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.vat}>
            <TableCell className="max-w-56 truncate">{r.partner}</TableCell>
            <TableCell className="font-mono text-xs">BE{r.vat}</TableCell>
            <TableCell className={num}>{formatCents(r.netCents)}</TableCell>
            <TableCell className={num}>{formatCents(r.vatCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>{rows.length} customers</TableCell>
          <TableCell className={num}>
            {formatCents(rows.reduce((s, r) => s + r.netCents, 0))}
          </TableCell>
          <TableCell className={num}>
            {formatCents(rows.reduce((s, r) => s + r.vatCents, 0))}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export function IntraListingTable({ rows }: { rows: IntraRow[] }) {
  if (rows.length === 0) return <Empty text="No reverse-charge service to an EU customer." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>VAT number</TableHead>
          <TableHead>Code</TableHead>
          <TableHead className={num}>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.country}${r.vat}${r.partner}`}>
            <TableCell className="max-w-56 truncate">{r.partner}</TableCell>
            <TableCell className="font-mono text-xs">
              {r.country}
              {r.vat || "⚠ missing"}
            </TableCell>
            <TableCell>S</TableCell>
            <TableCell className={num}>{formatCents(r.netCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
