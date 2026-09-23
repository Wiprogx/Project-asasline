import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditRow } from "../queries";

/** Brussels time, "YYYY-MM-DD HH:MM", the same on every screen whatever the server's zone. */
const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Brussels",
  dateStyle: "short",
  timeStyle: "short",
});

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Who</TableHead>
          <TableHead>What</TableHead>
          <TableHead className="hidden lg:table-cell">Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs whitespace-nowrap">
              {stamp.format(r.at)}
            </TableCell>
            <TableCell>{r.who ?? <span className="text-muted-foreground">unknown</span>}</TableCell>
            <TableCell className="font-mono text-xs">
              {r.action}
              {r.entity && <span className="text-muted-foreground"> · {r.entity}</span>}
            </TableCell>
            <TableCell className="hidden max-w-md truncate font-mono text-xs text-muted-foreground lg:table-cell">
              {r.detail ? JSON.stringify(r.detail) : ""}
              {r.ip && ` · ${r.ip}`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
