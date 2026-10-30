"use client";

import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { mirrorOf, type ViewState } from "@/hooks/use-view-transform";

type Size = { w: number; h: number };

/** pdf.js, loaded only when a PDF is opened (it is large, and it needs the browser). */
async function openPdf(src: string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs.getDocument({ url: src }).promise;
}

/** One page: a placeholder of its size until it scrolls near, then drawn sharp for the screen. */
function PdfPage({
  doc,
  n,
  scale,
  view,
  guess,
}: {
  doc: PDFDocumentProxy;
  n: number;
  scale: number;
  view: ViewState;
  guess: Size;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || page) return;
    let live = true;
    void doc.getPage(n).then((p) => live && setPage(p));
    return () => {
      live = false;
    };
  }, [near, page, doc, n]);

  const vp = page?.getViewport({ scale, rotation: view.turns * 90 });
  useEffect(() => {
    const c = canvas.current;
    if (!page || !c) return;
    const dpr = window.devicePixelRatio || 1;
    const sharp = page.getViewport({ scale: scale * dpr, rotation: view.turns * 90 });
    c.width = Math.floor(sharp.width);
    c.height = Math.floor(sharp.height);
    const task: RenderTask = page.render({ canvas: c, viewport: sharp });
    task.promise.catch(() => {}); // cancelled by the next zoom or turn
    return () => task.cancel();
  }, [page, scale, view.turns]);

  const size = vp ? { w: vp.width, h: vp.height } : guess;
  return (
    <div
      ref={box}
      data-page={n}
      className="relative shrink-0 bg-white shadow-lg ring-1 ring-black/10"
      style={{ width: size.w, height: size.h, transform: mirrorOf(view) }}
    >
      {page && <canvas ref={canvas} className="block size-full" aria-label={`Page ${n}`} />}
    </div>
  );
}

/**
 * A PDF drawn by pdf.js, page under page: fit to the stage's width at zoom 1, turned by
 * pdf.js itself (so a turned page lays out right), mirrored by CSS. Tells the toolbar how
 * many pages there are and which one is in view.
 */
export function PdfStage({
  src,
  view,
  onPages,
  onPage,
}: {
  src: string;
  view: ViewState;
  onPages: (n: number) => void;
  onPage: (n: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [first, setFirst] = useState<Size | null>(null);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    let opened: PDFDocumentProxy | null = null;
    openPdf(src)
      .then(async (d) => {
        opened = d;
        const p = await d.getPage(1);
        const v = p.getViewport({ scale: 1 });
        if (!live) return;
        setFirst({ w: v.width, h: v.height });
        setDoc(d);
        onPages(d.numPages);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      void opened?.destroy();
    };
  }, [src, onPages]);

  useEffect(() => {
    // The scrolling stage, not this column: the column grows with the zoom.
    const el = host.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || !doc) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) onPage(Number(e.target.getAttribute("data-page")));
      },
      { threshold: 0.5 },
    );
    el.querySelectorAll("[data-page]").forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [doc, onPage]);

  if (failed) return <p className="m-auto text-sm text-white/80">This PDF could not be read.</p>;
  const sideways = view.turns % 2 === 1;
  const base = first && width ? (width - 48) / (sideways ? first.h : first.w) : 1;
  const scale = Math.min(base, 2) * view.zoom;
  const guess = first
    ? sideways
      ? { w: first.h * scale, h: first.w * scale }
      : { w: first.w * scale, h: first.h * scale }
    : { w: 600, h: 800 };
  return (
    <div ref={host} className="mx-auto flex w-max min-w-full flex-col items-center gap-6 px-6 py-6">
      {doc ? (
        Array.from({ length: doc.numPages }, (_, i) => (
          <PdfPage key={i} doc={doc} n={i + 1} scale={scale} view={view} guess={guess} />
        ))
      ) : (
        <div
          className="mt-24 size-10 animate-spin rounded-full border-4 border-white/20 border-t-white"
          role="status"
          aria-label="Opening the PDF"
        />
      )}
    </div>
  );
}
