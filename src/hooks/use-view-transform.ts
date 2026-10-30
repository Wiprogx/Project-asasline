"use client";

import { useCallback, useMemo, useState } from "react";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 6;
const STEP = 1.25;

export type ViewState = {
  /** 1 = fit (the stage decides what "fit" is: the page width, the whole photo). */
  zoom: number;
  /** Quarter turns clockwise, 0..3. */
  turns: number;
  flipX: boolean;
  flipY: boolean;
  /** Pan offset in CSS px, for a photo larger than the stage. */
  pan: { x: number; y: number };
};

const FRESH: ViewState = { zoom: 1, turns: 0, flipX: false, flipY: false, pan: { x: 0, y: 0 } };

const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** How the viewer is looking at a file: zoom, quarter turns, mirror, pan. Reset per file. */
export function useViewTransform() {
  const [view, setView] = useState<ViewState>(FRESH);

  const zoomBy = useCallback(
    (factor: number) => setView((v) => ({ ...v, zoom: clamp(v.zoom * factor) })),
    [],
  );
  const actions = useMemo(
    () => ({
      zoomIn: () => zoomBy(STEP),
      zoomOut: () => zoomBy(1 / STEP),
      zoomBy,
      zoomTo: (zoom: number) => setView((v) => ({ ...v, zoom: clamp(zoom), pan: { x: 0, y: 0 } })),
      fit: () => setView((v) => ({ ...v, zoom: 1, pan: { x: 0, y: 0 } })),
      rotateRight: () => setView((v) => ({ ...v, turns: (v.turns + 1) % 4 })),
      rotateLeft: () => setView((v) => ({ ...v, turns: (v.turns + 3) % 4 })),
      flipX: () => setView((v) => ({ ...v, flipX: !v.flipX })),
      flipY: () => setView((v) => ({ ...v, flipY: !v.flipY })),
      panBy: (dx: number, dy: number) =>
        setView((v) => ({ ...v, pan: { x: v.pan.x + dx, y: v.pan.y + dy } })),
      reset: () => setView(FRESH),
    }),
    [zoomBy],
  );
  return { view, act: actions };
}

export type ViewActions = ReturnType<typeof useViewTransform>["act"];

/** The CSS mirror of a view; rotation is left to the stage (pdf.js turns pages itself). */
export const mirrorOf = (v: ViewState) => `scale(${v.flipX ? -1 : 1}, ${v.flipY ? -1 : 1})`;
