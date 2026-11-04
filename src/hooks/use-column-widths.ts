"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { clampWidth } from "@/domain/table-prefs";

export type Widths = Record<string, number>;

/**
 * The widths of a table's columns as the person drags them: the table follows at once, the
 * server is told once the dragging settles (`save`, debounced). A new set from the server (after
 * a save, or a reset) replaces what is shown, unless a drag is still unsaved.
 */
export function useColumnWidths(given: Widths, save: (widths: Widths) => Promise<unknown>) {
  const [widths, setWidths] = useState(given);
  const [seen, setSeen] = useState(given);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const latest = useRef(widths);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (seen !== given) {
    setSeen(given);
    if (!dirty) setWidths(given);
  }
  useEffect(() => {
    latest.current = widths;
  }, [widths]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const resize = (key: string, px: number) => {
    const next = { ...latest.current, [key]: clampWidth(px) };
    latest.current = next;
    setWidths(next);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      start(async () => {
        await save(latest.current);
        setDirty(false);
      });
    }, 500);
  };
  return { widths, resize, pending };
}
