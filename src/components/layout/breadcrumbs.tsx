"use client";

import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** A segment's word on the trail where title case would get it wrong. */
const LABELS: Record<string, string> = {
  account: "My account",
  "activity-rules": "Activity rules",
  aged: "Aged balance",
  "by-month": "By month",
  "cash-flow": "Cash flow",
  "hs-codes": "HS codes",
  "id-formats": "ID formats",
  kpis: "KPIs",
  "line-items": "Line items",
  odoo: "Odoo cut-over",
  "price-lists": "Price lists",
  "quotation-document": "Quotation document",
  "rate-sources": "Rate sources",
  sepa: "SEPA",
  vat: "VAT",
};

const wordOf = (seg: string, sections: Record<string, string>) =>
  sections[seg] ?? LABELS[seg] ?? seg.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** A record's key in the URL (a uuid, an ISO code, an account number): named by the page. */
const isRecord = (seg: string) =>
  /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(seg) || /^[A-Z]{2}$/.test(seg) || /^\d+$/.test(seg);

/** A prefix of the URL that is no page of its own: shown on the trail, not linked. */
const hasPage = (href: string) =>
  href !== "/discuss/room" && !/^\/settings\/users\/[^/]+$/.test(href);

type Heads = { h1: string; h2: string };

/** The page's headings, followed as the office's pages stream in behind their loading shell. */
function useHeadings(pathname: string): Heads {
  const [heads, setHeads] = useState<Heads>({ h1: "", h2: "" });
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const read = () => {
      const h1 = main.querySelector("h1")?.textContent?.trim() ?? "";
      const h2 = main.querySelector("h2")?.textContent?.trim() ?? "";
      setHeads((prev) => (prev.h1 === h1 && prev.h2 === h2 ? prev : { h1, h2 }));
    };
    read();
    const watch = new MutationObserver(read);
    watch.observe(main, { childList: true, subtree: true, characterData: true });
    return () => watch.disconnect();
  }, [pathname]);
  return heads;
}

type Crumb = { href: string; label: string; link: boolean };

/** The trail from Home to here, each segment a word; a record's segment named by its page. */
function trailOf(pathname: string, heads: Heads, sections: Record<string, string>): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ href: "/", label: "Home", link: true }];
  for (const [i, seg] of segments.entries()) {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const words = crumbs.map((c) => c.label);
    // A record's page names it in its h1; a settings record keeps "Settings" there and names
    // itself in its h2.
    const named = heads.h1 && !words.includes(heads.h1) ? heads.h1 : heads.h2;
    const label = isRecord(seg) ? named || seg.slice(0, 8) : wordOf(seg, sections);
    crumbs.push({ href, label, link: hasPage(href) });
  }
  return crumbs;
}

/**
 * Where the person is and the way back (legacy: the title bar's back arrow): a trail of links
 * from Home down to this page, and a Back button that returns through the history — or up
 * one level when the page was opened directly.
 */
export function Breadcrumbs({
  sections,
}: {
  /** The apps' words by their first URL segment (the launcher's labels). */
  sections: Record<string, string>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const heads = useHeadings(pathname);
  const crumbs = trailOf(pathname, heads, sections);
  const parent = [...crumbs].reverse().find((c, i) => i > 0 && c.link) ?? crumbs[0];
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push(parent.href);
  };
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={back} className="shrink-0 px-2">
        <ArrowLeftIcon aria-hidden className="size-4" />
        <span className="sr-only sm:not-sr-only">Back</span>
      </Button>
      <nav aria-label="Breadcrumb" className="min-w-0 overflow-x-auto">
        <ol className="flex items-center gap-1 text-sm whitespace-nowrap">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={c.href} className="flex min-w-0 items-center gap-1">
                {i > 0 && (
                  <ChevronRightIcon
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                )}
                {last ? (
                  <span aria-current="page" className="max-w-56 truncate font-medium">
                    {c.label}
                  </span>
                ) : c.link ? (
                  <Link
                    href={c.href}
                    className="max-w-56 truncate text-muted-foreground hover:text-foreground"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="max-w-56 truncate text-muted-foreground">{c.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
