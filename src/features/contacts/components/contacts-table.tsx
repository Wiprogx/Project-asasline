import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lettermark } from "@/domain/contacts";
import type { ContactRow } from "../queries";

export function ContactsTable({ rows }: { rows: ContactRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No contacts match.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">Email</TableHead>
          <TableHead className="hidden md:table-cell">Phone</TableHead>
          <TableHead className="hidden lg:table-cell">VAT</TableHead>
          <TableHead>Place</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className={c.archived ? "opacity-60" : undefined}>
            <TableCell>
              <Link
                href={`/contacts/${c.id}`}
                className="flex items-center gap-2 font-medium hover:underline"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">{lettermark(c.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{c.name}</span>
              </Link>
            </TableCell>
            <TableCell className="hidden md:table-cell">{c.email ?? "—"}</TableCell>
            <TableCell className="hidden md:table-cell">{c.phone ?? "—"}</TableCell>
            <TableCell className="hidden font-mono text-xs lg:table-cell">{c.vat ?? "—"}</TableCell>
            <TableCell>{[c.city, c.country].filter(Boolean).join(", ") || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
