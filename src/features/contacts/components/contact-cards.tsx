import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { lettermark } from "@/domain/contacts";
import type { ContactRow } from "../list-queries";
import { Matched, Tasks } from "./contacts-table";
import { PagerSource } from "@/components/shared/pager-source";
import { ContactTypeIcon } from "./contact-type-icon";

/**
 * The contacts as cards (legacy cvKanban): the mark, where they are, how to write to them,
 * and at a glance their type, bookings, open activities and linked contacts.
 */
export function ContactCards({ rows }: { rows: ContactRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No contacts match.</p>;
  }
  return (
    <ul aria-label="Contacts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <PagerSource kind="contacts" ids={rows.map((r) => r.id)} />
      {rows.map((c) => (
        <li key={c.id} className="flex gap-3 rounded-lg border p-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{lettermark(c.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-sm">
            <Link
              href={`/contacts/${c.id}`}
              className="flex items-center gap-1.5 font-medium hover:underline"
            >
              <ContactTypeIcon type={c.type} />
              {c.name}
            </Link>
            <div className="text-muted-foreground">
              {[c.city, c.countryName ?? c.country].filter(Boolean).join(", ") || "—"}
            </div>
            {c.email && <div className="truncate text-info">{c.email}</div>}
            <Matched matched={c.matched} />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {c.bookings > 0 && (
                <ToneBadge tone="success">
                  {c.bookings} booking{c.bookings === 1 ? "" : "s"}
                </ToneBadge>
              )}
              {c.openTasks > 0 && <Tasks open={c.openTasks} late={c.lateTasks} />}
              {c.linked > 0 && <ToneBadge tone="neutral">{c.linked} linked</ToneBadge>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
