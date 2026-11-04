"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type CellMenuItem, MenuCell, similarAndOut } from "@/components/shared/cell-menu";
import { PagerSource } from "@/components/shared/pager-source";
import { ResizableHead } from "@/components/shared/resizable-head";
import { ariaSort, SortToggle } from "@/components/shared/sortable-head";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import {
  CONTACT_COLUMNS,
  CONTACT_NAME_COLUMN,
  type ContactColumnKey,
  excludeParam,
  type FilterField,
  filterParam,
} from "@/domain/contact-list";
import { lettermark } from "@/domain/contacts";
import { useColumnWidths, type Widths } from "@/hooks/use-column-widths";
import { useUrlSort } from "@/hooks/use-url-sort";
import { hrefWith } from "@/lib/url";
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

type Hint = { field: FilterField; value: string; label: string };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What a cell's right-click menu can filter on: the values it shows that are filters too. */
const HINTS: Partial<Record<"name" | ContactColumnKey, (c: ContactRow) => Hint[]>> = {
  name: (c) => [{ field: "type", value: c.type, label: `Type: ${cap(c.type)}` }],
  professions: (c) =>
    c.professions.map((p) => ({ field: "profession", value: p, label: `Industry: ${p}` })),
  place: (c) => [
    ...(c.city ? [{ field: "city" as const, value: c.city, label: `City: ${c.city}` }] : []),
    ...(c.country
      ? [
          {
            field: "country" as const,
            value: c.country,
            label: `Country: ${c.countryName ?? c.country}`,
          },
        ]
      : []),
  ],
  lang: (c) => [{ field: "lang", value: c.lang, label: `Language: ${c.lang.toUpperCase()}` }],
};

const saveWidths = (widths: Widths) => saveContactView({ widths });

/**
 * The contacts in the columns the person chose, each as wide as they dragged it (legacy cvList,
 * C_COLS), ordered as asked; a right click on a cell keeps or leaves out the rows like it.
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
  const pathname = usePathname();
  const params = useSearchParams();
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No contacts match.</p>;
  }
  const cols = [CONTACT_NAME_COLUMN, ...CONTACT_COLUMNS.filter((c) => columns.includes(c.key))];
  const widthOf = (c: (typeof cols)[number]) => widths[c.key] ?? c.width;
  const total = cols.reduce((sum, c) => sum + widthOf(c), 0);
  const menuOf = (key: "name" | ContactColumnKey, c: ContactRow): CellMenuItem[] =>
    (HINTS[key]?.(c) ?? []).flatMap((h) =>
      similarAndOut(
        h.label,
        hrefWith(pathname, params, {
          [filterParam(h.field)]: h.value,
          [excludeParam(h.field)]: null,
        }),
        hrefWith(pathname, params, {
          [excludeParam(h.field)]: h.value,
          [filterParam(h.field)]: null,
        }),
      ),
    );
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
            <MenuCell items={menuOf("name", c)} className="overflow-hidden align-top">
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
            </MenuCell>
            {cols.slice(1).map((k) => (
              <MenuCell
                key={k.key}
                items={menuOf(k.key as ContactColumnKey, c)}
                className="overflow-hidden align-top text-ellipsis"
              >
                {CELLS[k.key as ContactColumnKey](c)}
              </MenuCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
