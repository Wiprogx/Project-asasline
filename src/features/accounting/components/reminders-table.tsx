import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysBetween } from "@/domain/dates";
import { formatCents } from "@/domain/money";
import { REMIND_STEPS } from "@/domain/reminders";
import type { remindersDue } from "../reminder-queries";
import { ReminderDialog } from "./reminder-dialog";

const num = "text-right tabular-nums";
type Row = Awaited<ReturnType<typeof remindersDue>>[number];

const stepName = (level: number) => REMIND_STEPS.find((s) => s.level === level)?.name ?? "—";

/** Everything overdue; where a reminder is due today, the button to write it. */
export function RemindersTable({
  rows,
  today,
  canWrite,
}: {
  rows: Row[];
  today: string;
  canWrite: boolean;
}) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing overdue.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className={num}>Days late</TableHead>
          <TableHead className={num}>Open</TableHead>
          <TableHead>Last reminder</TableHead>
          <TableHead>Due now</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <Link className="font-mono hover:underline" href={`/accounting/invoices/${r.id}`}>
                {r.number}
              </Link>
            </TableCell>
            <TableCell className="max-w-48 truncate">{r.customer}</TableCell>
            <TableCell className={num}>{daysBetween(r.dueDate ?? today, today)}</TableCell>
            <TableCell className={num}>{formatCents(r.openCents)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {r.last ? `${stepName(r.last.level)}, ${r.last.sentOn}` : "none"}
            </TableCell>
            <TableCell>
              {r.step && r.text && canWrite ? (
                <ReminderDialog
                  id={r.id}
                  stepName={r.step.name}
                  number={r.number ?? ""}
                  to={r.email ?? ""}
                  subject={r.text.subject}
                  body={r.text.body}
                />
              ) : (
                <span className="text-sm text-muted-foreground">{r.step ? r.step.name : "—"}</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
