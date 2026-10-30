"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FlipHorizontal2,
  FlipVertical2,
  Maximize,
  Minimize,
  Printer,
  RotateCcw,
  RotateCw,
  Scan,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ViewActions, ViewState } from "@/hooks/use-view-transform";
import { cn } from "@/lib/utils";

/** An icon button with its name and shortcut in a tooltip (and the name for screen readers). */
export function Tool({
  label,
  keys,
  active,
  className,
  ...props
}: ComponentProps<typeof Button> & { label: string; keys?: string; active?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-30",
              active && "bg-white/15 text-white",
              className,
            )}
            {...props}
          />
        }
      />
      <TooltipContent side="bottom">
        {label}
        {keys && <kbd className="ml-1 rounded bg-background/20 px-1 font-mono">{keys}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

const Group = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">{children}</div>
);

/** What the viewer can do to the view (zoom, turn, mirror); only for what it can draw. */
export function ViewTools({ view, act }: { view: ViewState; act: ViewActions }) {
  return (
    <>
      <Group>
        <Tool label="Zoom out" keys="−" onClick={act.zoomOut}>
          <ZoomOut />
        </Tool>
        <button
          type="button"
          onClick={act.fit}
          className="min-w-14 rounded-md px-1.5 py-1 text-xs font-medium text-white/85 tabular-nums hover:bg-white/10"
          aria-label={`Zoom ${Math.round(view.zoom * 100)}%, fit`}
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <Tool label="Zoom in" keys="+" onClick={act.zoomIn}>
          <ZoomIn />
        </Tool>
        <Tool label="Fit" keys="0" onClick={act.fit}>
          <Scan />
        </Tool>
      </Group>
      <Group>
        <Tool label="Rotate left" keys="Shift R" onClick={act.rotateLeft}>
          <RotateCcw />
        </Tool>
        <Tool label="Rotate right" keys="R" onClick={act.rotateRight}>
          <RotateCw />
        </Tool>
        <Tool label="Flip horizontally" keys="H" active={view.flipX} onClick={act.flipX}>
          <FlipHorizontal2 />
        </Tool>
        <Tool label="Flip vertically" keys="V" active={view.flipY} onClick={act.flipY}>
          <FlipVertical2 />
        </Tool>
      </Group>
    </>
  );
}

/** Previous / next file of the list, with where we are in it. */
export function FileStepper({
  at,
  count,
  go,
}: {
  at: number;
  count: number;
  go: (i: number) => void;
}) {
  if (count < 2) return null;
  return (
    <Group>
      <Tool label="Previous file" keys="←" disabled={at === 0} onClick={() => go(at - 1)}>
        <ChevronLeft />
      </Tool>
      <span className="px-1 text-xs text-white/70 tabular-nums">
        {at + 1} / {count}
      </span>
      <Tool label="Next file" keys="→" disabled={at === count - 1} onClick={() => go(at + 1)}>
        <ChevronRight />
      </Tool>
    </Group>
  );
}

/** Out of the viewer: print, download, open in a tab, full screen, close. */
export function FileTools({
  name,
  href,
  canPrint,
  full,
  onPrint,
  onFull,
  onClose,
}: {
  name: string;
  href: string;
  canPrint: boolean;
  full: boolean;
  onPrint: () => void;
  onFull: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {canPrint && (
        <Tool label="Print" keys="P" onClick={onPrint}>
          <Printer />
        </Tool>
      )}
      <Tool
        label="Download"
        keys="D"
        render={<a href={href} download={name} />}
        nativeButton={false}
      >
        <Download />
      </Tool>
      <Tool
        label="Open in a new tab"
        render={<a href={href} target="_blank" rel="noopener" />}
        nativeButton={false}
      >
        <ExternalLink />
      </Tool>
      <Tool label={full ? "Leave full screen" : "Full screen"} keys="F" onClick={onFull}>
        {full ? <Minimize /> : <Maximize />}
      </Tool>
      <Tool label="Close" keys="Esc" onClick={onClose}>
        <X />
      </Tool>
    </>
  );
}
