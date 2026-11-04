"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PagerSource } from "@/components/shared/pager-source";
import { ResizableHead } from "@/components/shared/resizable-head";
import { ariaSort, SortToggle } from "@/components/shared/sortable-head";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { CONTACT_COLUMNS, CONTACT_NAME_COLUMN, type ContactColumnKey } from "@/domain/contact-list";
import { lettermark } from "@/domain/contacts";
import { useColumnWidths, type Widths } from "@/hooks/use-column-widths";
import { nextSort } from "@/lib/table-view";
import type { ContactRow } from "../list-queries";
import { saveContactView } from "../view-actions";
import { ContactTypeIcon } from "./contact-type-icon";

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
  professions: (c) => (c.professions.length ? c.professions.join(", ") : none),
  place: (c) => [c.city, c.countryName ?? c.country].filter(Boolean).join(", ") || none,
  vat: (c) => (c.vat ? <span className="font-mono text-xs">{c.vat}</span> : none),
  email: (c) => c.email ?? none,
  mobile: (c) => c.mobile ?? c.phone ?? none,
  lang: (c) => c.lang.toUpperCase(),
  linked: (c) => c.linked || none,
  bookings: (c) => c.bookings || none,
  tasks: (c) => <Tasks open={c.openTasks} late={c.lateTasks} />,
  note: (c) => (c.note ? <span className="line-clamp-2 max-w-56">{c.note}</span> : none),
};

const saveWidths = (widths: Widths) => saveContactView({ widths });

/** The order asked in the URL (?sort=&dir=), and a click on a header that moves it on. */
function useUrlSort() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = {
    sort: params.get("sort"),
    dir: params.get("dir") === "desc" ? ("desc" as const) : ("asc" as const),
  };
  const toggleSort = (key: string) => {
    const s = nextSort(state, key);
    const next = new URLSearchParams(params);
    next.delete("page");
    if (s.sort) next.set("sort", s.sort);
    else next.delete("sort");
    if (s.sort && s.dir === "desc") next.set("dir", "desc");
    else next.delete("dir");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return { state, toggleSort };
}

/**
 * The contacts in the columns the person chose, each as wide as they dragged it (legacy cvList,
 * C_COLS): the widths are the person's own and follow them to every browser.
 */
export function ContactsTable({
  rows,
  columns,
  widths: given,
}: {
  rows: ContactRow[];
  columns: readonly ContactColumnKey[];
  widths: Widths;
}) {
  const { widths, resize, pending } = useColumnWidths(given, saveWidths);
  const { state, toggleSort } = useUrlSort();
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No contacts match.</p>;
  }
  const cols = [CONTACT_NAME_COLUMN, ...CONTACT_COLUMNS.filter((c) => columns.includes(c.key))];
  const widthOf = (c: (typeof cols)[number]) => widths[c.key] ?? c.width;
  const total = cols.reduce((sum, c) => sum + widthOf(c), 0);
  return (
    <Table
      aria-label="Contacts"
      aria-busy={pending}
      className="table-fixed"
      style={{ minWidth: total }}
    >
      <PagerSource kind="contacts" ids={rows.map((r) => r.id)} />
      <colgroup>
        {cols.map((c) => (
          <col key={c.key} style={{ width: widthOf(c) }} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          {cols.map((c) => (
            <ResizableHead
              key={c.key}
              label={c.label}
              width={widthOf(c)}
              onResize={(px) => resize(c.key, px)}
              aria-sort={ariaSort(state, c.key)}
            >
              <SortToggle sortKey={c.key} state={state} onSort={toggleSort}>
                {c.label}
              </SortToggle>
            </ResizableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className={c.archived ? "text-muted-foreground" : undefined}>
            <TableCell className="overflow-hidden align-top">
              <Link
                href={`/contacts/${c.id}`}
                className="flex items-center gap-2 font-medium hover:underline"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">{lettermark(c.name)}</AvatarFallback>
                </Avatar>
                <ContactTypeIcon type={c.type} />
                <span className="truncate">{c.name}</span>
              </Link>
              <Matched matched={c.matched} />
            </TableCell>
            {cols.slice(1).map((k) => (
              <TableCell key={k.key} className="overflow-hidden align-top text-ellipsis">
                {CELLS[k.key as ContactColumnKey](c)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
