import Link from "next/link";
import { NewTab } from "@/components/shared/new-tab";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContactFile } from "../file-queries";

const size = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Every paper on the contact's file, and where it is filed. */
export function ContactFiles({ rows }: { rows: ContactFile[] }) {
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing filed on this contact&apos;s shipments or documents yet.
      </p>
    );
  return (
    <Table aria-label="Contact files">
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead className="hidden md:table-cell">Filed as</TableHead>
          <TableHead>On</TableHead>
          <TableHead className="hidden md:table-cell">Day</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((f) => (
          <TableRow key={`${f.where.kind}-${f.id}`}>
            <TableCell>
              <a
                className="font-medium hover:underline"
                href={f.href}
                target="_blank"
                rel="noopener"
              >
                {f.name}
                <NewTab />
              </a>
              <span className="text-muted-foreground"> · {size(f.sizeBytes)}</span>
            </TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">
              {f.code ?? "—"}
            </TableCell>
            <TableCell>
              <Link
                className="font-mono text-xs hover:underline"
                href={
                  f.where.kind === "booking"
                    ? `/bookings/${f.where.id}/documents`
                    : `/accounting/invoices/${f.where.id}`
                }
              >
                {f.where.ref}
              </Link>
            </TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">{f.on}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
