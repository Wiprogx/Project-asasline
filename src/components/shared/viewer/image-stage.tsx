"use client";

import Image from "next/image";
import { type PointerEvent, useRef, useState } from "react";
import { mirrorOf, type ViewActions, type ViewState } from "@/hooks/use-view-transform";
import { cn } from "@/lib/utils";

/**
 * A photo fitted to the stage (turned sideways, it fits the other way: container units),
 * zoomed and turned by CSS, dragged to pan once zoomed; a double click zooms to 2× and back.
 */
export function ImageStage({
  src,
  alt,
  view,
  act,
}: {
  src: string;
  alt: string;
  view: ViewState;
  act: ViewActions;
}) {
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const sideways = view.turns % 2 === 1;
  const zoomed = view.zoom > 1;

  const down = (e: PointerEvent) => {
    if (!zoomed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  };
  const move = (e: PointerEvent) => {
    if (!drag.current) return;
    act.panBy(e.clientX - drag.current.x, e.clientY - drag.current.y);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const up = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div
      className={cn(
        "[container-type:size] grid size-full touch-none place-items-center overflow-hidden select-none",
        zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
      )}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={() => (zoomed ? act.fit() : act.zoomTo(2))}
    >
      <Image
        src={src}
        alt={alt}
        unoptimized
        width={0}
        height={0}
        draggable={false}
        className={cn(
          "h-auto w-auto object-contain shadow-2xl transition-transform duration-200 ease-out",
          sideways ? "max-h-[96cqw] max-w-[96cqh]" : "max-h-[96cqh] max-w-[96cqw]",
          dragging && "transition-none",
        )}
        style={{
          transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom}) rotate(${view.turns * 90}deg) ${mirrorOf(view)}`,
        }}
      />
    </div>
  );
}
