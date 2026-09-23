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
import type { assetsScreen } from "../asset-queries";
import { AssetYears, DisposeAsset } from "./asset-controls";

const num = "text-right tabular-nums";
type Row = Awaited<ReturnType<typeof assetsScreen>>[number];

/** Equipment, what it cost, what is depreciated and what it is still worth. */
export function AssetsTable({
  rows,
  today,
  canEdit,
}: {
  rows: Row[];
  today: string;
  canEdit: boolean;
}) {
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No assets yet. A supplier bill line on an equipment account (230000) becomes one.
      </p>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Bought</TableHead>
          <TableHead className={num}>Cost</TableHead>
          <TableHead>Years</TableHead>
          <TableHead className={num}>Depreciated</TableHead>
          <TableHead className={num}>Book value</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ asset: a, bill, supplier, depreciatedCents, bookValueCents }) => (
          <TableRow key={a.id}>
            <TableCell>
              {a.name}
              <span className="block text-xs text-muted-foreground">
                <Link
                  className="font-mono hover:underline"
                  href={`/accounting/invoices/${a.invoiceId}`}
                >
                  {bill}
                </Link>{" "}
                · {supplier}
              </span>
            </TableCell>
            <TableCell className="font-mono text-xs">{a.acquiredOn}</TableCell>
            <TableCell className={num}>{formatCents(a.costCents)}</TableCell>
            <TableCell>
              {canEdit && !a.disposedOn ? (
                <AssetYears id={a.id} version={a.version} years={a.years} />
              ) : (
                a.years
              )}
            </TableCell>
            <TableCell className={num}>{formatCents(depreciatedCents)}</TableCell>
            <TableCell className={num}>{formatCents(bookValueCents)}</TableCell>
            <TableCell>
              {a.disposedOn ? (
                <ToneBadge tone="neutral">
                  Disposed {a.disposedOn} — {a.disposeNote}
                </ToneBadge>
              ) : (
                canEdit && (
                  <DisposeAsset id={a.id} version={a.version} name={a.name} today={today} />
                )
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
