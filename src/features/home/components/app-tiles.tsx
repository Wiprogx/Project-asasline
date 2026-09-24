import {
  CalendarCheckIcon,
  ContactIcon,
  FileTextIcon,
  MessageSquareIcon,
  ReceiptIcon,
  SettingsIcon,
  ShipIcon,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { appTiles } from "../queries";

type Tiles = Awaited<ReturnType<typeof appTiles>>;

type Tile = {
  href: string;
  label: string;
  line: string;
  count: number | null;
  icon: React.ReactNode;
};

/** The launcher (legacy vHome): each app the role opens, with what it holds today. */
export function AppTiles({ t, settings }: { t: Tiles; settings: boolean }) {
  const tiles: (Tile | null)[] = [
    t.tasks && {
      href: "/activity",
      label: "Activity",
      line: `${t.tasks.overdue ? `${t.tasks.overdue} overdue · ` : ""}${t.tasks.today} today · ${t.tasks.upcoming} upcoming`,
      count: t.tasks.overdue + t.tasks.today + t.tasks.upcoming,
      icon: <CalendarCheckIcon aria-hidden />,
    },
    t.quotes && {
      href: "/quotations",
      label: "Quotations",
      line: `${t.quotes.total} quotations · ${t.quotes.open} in follow-up`,
      count: t.quotes.total,
      icon: <FileTextIcon aria-hidden />,
    },
    t.books && {
      href: "/bookings",
      label: "Bookings",
      line: "Bookings, documents, containers, billing",
      count: t.books.total,
      icon: <ShipIcon aria-hidden />,
    },
    t.people && {
      href: "/contacts",
      label: "Contacts",
      line: `${t.people.total} contacts · ${t.people.addresses} extra addresses`,
      count: t.people.total,
      icon: <ContactIcon aria-hidden />,
    },
    t.mail && {
      href: "/discuss",
      label: "Discuss",
      line: "E-mail, WhatsApp and the team",
      count: t.mail.total,
      icon: <MessageSquareIcon aria-hidden />,
    },
    t.bills && {
      href: "/accounting",
      label: "Accounting",
      line: "Invoices, bank, VAT, Peppol",
      count: t.bills.total,
      icon: <ReceiptIcon aria-hidden />,
    },
    settings
      ? {
          href: "/settings",
          label: "Settings",
          line: "People, lists, rules, catalogue",
          count: null,
          icon: <SettingsIcon aria-hidden />,
        }
      : null,
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles
        .filter((x): x is Tile => !!x)
        .map((x) => (
          <li key={x.href}>
            <Link href={x.href} className="block rounded-xl focus-visible:outline-2">
              <Card
                size="sm"
                className="flex flex-row items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <span className="text-muted-foreground">{x.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{x.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{x.line}</span>
                </span>
                {x.count !== null && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
                    {x.count}
                  </span>
                )}
              </Card>
            </Link>
          </li>
        ))}
    </ul>
  );
}
