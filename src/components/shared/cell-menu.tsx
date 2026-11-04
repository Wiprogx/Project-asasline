"use client";

import Link from "next/link";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type CellMenuItem = { label: string; href: string };

const WIDTH = 240;

/**
 * A table cell that opens a small menu on a right click (or a long press): "Show similar" and
 * "Filter out" links for the value it holds. Escape, a click elsewhere or a scroll closes it;
 * the arrow keys walk the items. A cell with no items is an ordinary cell.
 */
export function MenuCell({
  items,
  className,
  children,
}: {
  items: readonly CellMenuItem[];
  className?: string;
  children: React.ReactNode;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const close = () => setAt(null);
    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !menu.current?.contains(e.target)) close();
    };
    document.addEventListener("pointerdown", away);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [at]);
  if (items.length === 0) return <TableCell className={className}>{children}</TableCell>;
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setAt({
      x: Math.min(e.clientX, window.innerWidth - WIDTH - 8),
      y: Math.min(e.clientY, window.innerHeight - 8 - items.length * 34),
    });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") return setAt(null);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const links = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLElement);
    links[(i + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length]?.focus();
  };
  return (
    <TableCell className={className} onContextMenu={onContextMenu}>
      {children}
      {at && (
        <div
          ref={menu}
          role="menu"
          aria-label="Filter on this value"
          style={{ position: "fixed", left: at.x, top: at.y, width: WIDTH }}
          className="z-50 rounded-md border bg-popover p-1 text-sm whitespace-normal shadow-md"
          onKeyDown={onKeyDown}
        >
          {items.map((it) => (
            <Link
              key={it.label}
              role="menuitem"
              href={it.href}
              onClick={() => setAt(null)}
              className={cn(
                "block rounded-sm px-2 py-1.5 outline-none hover:bg-accent focus-visible:bg-accent",
              )}
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </TableCell>
  );
}

/** The two links of a value: the rows like it, and the rows without it. */
export function similarAndOut(what: string, similar: string, out: string): CellMenuItem[] {
  return [
    { label: `Show similar · ${what}`, href: similar },
    { label: `Filter out · ${what}`, href: out },
  ];
}
