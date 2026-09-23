import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { GRID_LABEL, GRID_SECTIONS, vatPeriodOf, vatPeriodShift } from "@/domain/vat";
import { cn } from "@/lib/utils";

const num = "text-right tabular-nums";

/** Previous · period · next, and the switch between monthly and quarterly filing. */
export function VatPeriodNav({ period }: { period: string }) {
  const quarterly = period.includes("Q");
  const link = (p: string, label: string, current = false) => (
    <Link
      href={`/accounting/vat?p=${p}`}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm",
        current ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  const first = `${period.slice(0, 4)}-${quarterly ? String((Number(period.slice(-1)) - 1) * 3 + 1).padStart(2, "0") : period.slice(5, 7)}-01`;
  return (
    <nav aria-label="VAT period" className="flex flex-wrap items-center gap-1">
      {link(vatPeriodShift(period, -1), "‹ Previous")}
      {link(period, period, true)}
      {link(vatPeriodShift(period, 1), "Next ›")}
      <span className="mx-2 text-muted-foreground">·</span>
      {link(vatPeriodOf(first, "quarterly"), "Quarterly", quarterly)}
      {link(vatPeriodOf(first, "monthly"), "Monthly", !quarterly)}
    </nav>
  );
}

/** The grids of form 625, by section; only grids with an amount are shown. */
export function VatGrids({ grids }: { grids: Map<string, number> }) {
  const row = (g: string) =>
    grids.get(g) ? (
      <TableRow key={g}>
        <TableCell className="w-12 font-mono font-medium">{g}</TableCell>
        <TableCell>{GRID_LABEL[g]}</TableCell>
        <TableCell className={num}>{formatCents(grids.get(g))}</TableCell>
      </TableRow>
    ) : null;
  const payable = grids.has("71");
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Grids</h2>
      </CardHeader>
      <CardContent>
        <Table>
          {Object.entries(GRID_SECTIONS).map(([section, gs]) => (
            <TableBody key={section}>
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-xs font-medium text-muted-foreground uppercase"
                >
                  {section}
                </TableCell>
              </TableRow>
              {gs.some((g) => grids.get(g)) ? (
                gs.map(row)
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    none
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          ))}
          <TableBody>
            <TableRow className="font-medium">
              <TableCell className="font-mono">{payable ? "71" : "72"}</TableCell>
              <TableCell>{payable ? "VAT to pay" : "VAT to recover"}</TableCell>
              <TableCell className={num}>
                {formatCents(grids.get("71") ?? grids.get("72") ?? 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
