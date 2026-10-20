import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CONTACT_COLUMNS,
  CONTACT_KIND_LABEL,
  CONTACT_KIND_TONE,
  type ContactColumnKey,
} from "@/domain/contact-list";
import { lettermark } from "@/domain/contacts";
import type { ContactRow } from "../list-queries";

const none = <span className="text-muted-foreground">—</span>;

/** The address that answered the search, when the contact's own fields did not (legacy whyMatched). */
export function Matched({ matched }: { matched: string[] }) {
  if (!matched.length) return null;
  return (
    <div className="mt-0.5 text-xs text-info">
      ↳ {matched.slice(0, 2).join(" · ")}
      {matched.length > 2 && ` +${matched.length - 2} more`}
    </div>
  );
}

export function Tasks({ open, late }: { open: number; late: number }) {
  if (!open) return none;
  return (
    <ToneBadge tone={late ? "danger" : "neutral"}>
      {open} open{late ? ` · ${late} overdue` : ""}
    </ToneBadge>
  );
}

const CELLS: Record<ContactColumnKey, (c: ContactRow) => React.ReactNode> = {
  kind: (c) => <ToneBadge tone={CONTACT_KIND_TONE[c.kind]}>{CONTACT_KIND_LABEL[c.kind]}</ToneBadge>,
  professions: (c) => (c.professions.length ? c.professions.join(", ") : none),
  place: (c) => [c.city, c.countryName ?? c.country].filter(Boolean).join(", ") || none,
  vat: (c) => (c.vat ? <span className="font-mono text-xs">{c.vat}</span> : none),
  email: (c) => c.email ?? none,
  mobile: (c) => c.mobile ?? c.phone ?? none,
  lang: (c) => c.lang.toUpperCase(),
  addresses: (c) => c.addresses || none,
  bookings: (c) => c.bookings || none,
  tasks: (c) => <Tasks open={c.openTasks} late={c.lateTasks} />,
  note: (c) => (c.note ? <span className="line-clamp-2 max-w-56">{c.note}</span> : none),
};

/** The contacts in the columns the office chose (legacy cvList, C_COLS). */
export function ContactsTable({
  rows,
  columns,
}: {
  rows: ContactRow[];
  columns: readonly ContactColumnKey[];
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No contacts match.</p>;
  }
  const cols = CONTACT_COLUMNS.filter((c) => columns.includes(c.key));
  return (
    <Table
      aria-label="Contacts"
      style={{ minWidth: `${Math.max(560, 260 + cols.length * 110)}px` }}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          {cols.map((c) => (
            <TableHead key={c.key}>{c.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className={c.archived ? "text-muted-foreground" : undefined}>
            <TableCell className="align-top">
              <Link
                href={`/contacts/${c.id}`}
                className="flex items-center gap-2 font-medium hover:underline"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">{lettermark(c.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{c.name}</span>
              </Link>
              <Matched matched={c.matched} />
            </TableCell>
            {cols.map((k) => (
              <TableCell key={k.key} className="align-top">
                {CELLS[k.key](c)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
