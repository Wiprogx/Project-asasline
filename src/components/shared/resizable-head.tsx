"use client";

import { type KeyboardEvent, type PointerEvent, type ReactNode, useRef } from "react";
import { TableHead } from "@/components/ui/table";
import { WIDTH_MAX, WIDTH_MIN, WIDTH_STEP } from "@/domain/table-prefs";
import { cn } from "@/lib/utils";

/**
 * A column header with a drag handle on its right edge. The handle is a focusable separator:
 * dragged with a pointer, or moved with the arrow keys (2.5.7, a drag has a keyboard way);
 * Home and End put it at the narrowest and the widest.
 */
export function ResizableHead({
  label,
  width,
  onResize,
  className,
  children,
  ...rest
}: {
  label: string;
  width: number;
  onResize: (px: number) => void;
  className?: string;
  children: ReactNode;
  "aria-sort"?: "ascending" | "descending";
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, width };
  };
  const onPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (drag.current) onResize(drag.current.width + e.clientX - drag.current.x);
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    const step = { ArrowLeft: -WIDTH_STEP, ArrowRight: WIDTH_STEP }[e.key];
    const to = step
      ? width + step
      : e.key === "Home"
        ? WIDTH_MIN
        : e.key === "End"
          ? WIDTH_MAX
          : null;
    if (to === null) return;
    e.preventDefault();
    onResize(to);
  };
  return (
    <TableHead className={cn("relative", className)} {...rest}>
      {children}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize column ${label}`}
        aria-valuenow={width}
        aria-valuemin={WIDTH_MIN}
        aria-valuemax={WIDTH_MAX}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 -right-1 w-2 cursor-col-resize touch-none outline-none select-none after:absolute after:inset-y-2 after:left-1/2 after:w-px after:bg-border hover:after:w-0.5 hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-primary"
      />
    </TableHead>
  );
}
