import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CashFlow } from "@/domain/cash-flow";
import { formatCents } from "@/domain/money";

const num = "text-right tabular-nums";

/** What went through the bank, month by month (legacy cash flow). */
export function CashFlowTable({ flow }: { flow: CashFlow }) {
  if (flow.months.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No money moved through the bank in this period.
      </p>
    );
  return (
    <Table aria-label="Cash flow">
      <TableHeader>
        <TableRow>
          <TableHead />
          {flow.months.map((m) => (
            <TableHead key={m} className={num}>
              {m}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="text-muted-foreground">Cash at the start</TableCell>
          {flow.months.map((m) => (
            <TableCell key={m} className={num}>
              {formatCents(flow.startCents[m])}
            </TableCell>
          ))}
        </TableRow>
        {flow.kinds.map((k) => (
          <TableRow key={k}>
            <TableCell>{k}</TableCell>
            {flow.months.map((m) => (
              <TableCell key={m} className={num}>
                {formatCents(flow.cells[k][m] ?? 0)}
              </TableCell>
            ))}
          </TableRow>
        ))}
        <TableRow>
          <TableCell className="font-medium">Net</TableCell>
          {flow.months.map((m) => (
            <TableCell key={m} className={`${num} font-medium`}>
              {formatCents(flow.netCents[m])}
            </TableCell>
          ))}
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Cash at the end</TableCell>
          {flow.months.map((m) => (
            <TableCell key={m} className={num}>
              {formatCents(flow.endCents[m])}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  );
}
