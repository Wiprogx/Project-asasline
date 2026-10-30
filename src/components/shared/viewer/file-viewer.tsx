"use client";

import { FileQuestion } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useViewTransform, type ViewActions } from "@/hooks/use-view-transform";
import { ImageStage } from "./image-stage";
import { PdfStage } from "./pdf-stage";
import { FileStepper, FileTools, ViewTools } from "./viewer-toolbar";

export type ViewerFile = { id: string; name: string; href: string; detail?: string };

const kindOf = (name: string) =>
  /\.pdf$/i.test(name) ? "pdf" : /\.(png|jpe?g)$/i.test(name) ? "image" : "other";

/** Prints the file through a hidden frame: the browser's own print of the PDF or the photo. */
function printFile(href: string) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  f.src = href;
  f.onload = () => {
    f.contentWindow?.focus();
    f.contentWindow?.print();
    setTimeout(() => f.remove(), 60_000);
  };
  document.body.append(f);
}

const SHORTCUTS: Record<string, (a: ViewActions) => void> = {
  "+": (a) => a.zoomIn(),
  "=": (a) => a.zoomIn(),
  "-": (a) => a.zoomOut(),
  "0": (a) => a.fit(),
  r: (a) => a.rotateRight(),
  R: (a) => a.rotateLeft(),
  h: (a) => a.flipX(),
  v: (a) => a.flipY(),
};

type BodyProps = {
  file: ViewerFile;
  at: number;
  count: number;
  go: (i: number) => void;
  close: () => void;
  actions?: ReactNode;
};

/** One file in the viewer; keyed by the file, so every file opens fresh (fit, upright). */
function ViewerBody({ file, at, count, go, close, actions }: BodyProps) {
  const { view, act } = useViewTransform();
  const shell = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [full, setFull] = useState(false);
  const kind = kindOf(file.name);
  const drawn = kind !== "other";

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.current?.closest("[data-slot=dialog-content]")?.requestFullscreen();
  }, []);

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Ctrl/⌘ + wheel or a pinch zooms; on a photo the plain wheel zooms too.
  useEffect(() => {
    const el = stage.current;
    if (!el || !drawn) return;
    const onWheel = (e: WheelEvent) => {
      if (kind === "pdf" && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      act.zoomBy(Math.exp(-e.deltaY * 0.0025));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [act, drawn, kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Only keys meant for the viewer: not in a field, not in a dialog opened over it.
      const mine = shell.current?.closest("[data-slot=dialog-content]");
      if (e.ctrlKey || e.metaKey || e.altKey || t.closest("input, textarea")) return;
      if (mine && t !== document.body && !mine.contains(t)) return;
      if (e.key === "ArrowLeft" && at > 0) go(at - 1);
      else if (e.key === "ArrowRight" && at < count - 1) go(at + 1);
      else if (e.key === "f") toggleFull();
      else if (e.key === "p" && drawn) printFile(file.href);
      else if (e.key === "d")
        shell.current?.querySelector<HTMLAnchorElement>("a[download]")?.click();
      else if (drawn && SHORTCUTS[e.key]) SHORTCUTS[e.key](act);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, at, count, go, toggleFull, drawn, file.href]);

  return (
    <div ref={shell} className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-neutral-900/90 px-3 py-2 backdrop-blur">
        <div className="mr-auto min-w-0">
          <DialogTitle className="truncate text-sm font-medium text-white">{file.name}</DialogTitle>
          <DialogDescription className="truncate text-xs text-white/60">
            {[file.detail, kind === "pdf" && pages ? `Page ${page} of ${pages}` : null]
              .filter(Boolean)
              .join(" · ") || "Preview"}
          </DialogDescription>
        </div>
        <FileStepper at={at} count={count} go={go} />
        {drawn && <ViewTools view={view} act={act} />}
        <div className="flex items-center gap-0.5">
          {actions}
          <FileTools
            name={file.name}
            href={file.href}
            canPrint={drawn}
            full={full}
            onPrint={() => printFile(file.href)}
            onFull={toggleFull}
            onClose={close}
          />
        </div>
      </header>
      <div ref={stage} className="relative min-h-0 flex-1 overflow-auto bg-neutral-950">
        {kind === "pdf" && (
          <PdfStage src={file.href} view={view} onPages={setPages} onPage={setPage} />
        )}
        {kind === "image" && <ImageStage src={file.href} alt={file.name} view={view} act={act} />}
        {kind === "other" && (
          <div className="grid h-full place-items-center p-6 text-center text-white/80">
            <div className="grid justify-items-center gap-3">
              <FileQuestion className="size-14 text-white/40" aria-hidden />
              <p className="text-sm">No preview for this kind of file.</p>
              <Button render={<a href={file.href} download={file.name} />} nativeButton={false}>
                Download {file.name}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The full-screen viewer: a PDF drawn page by page, a photo, or a download for the rest; zoom,
 * turn, mirror, full screen, print, download, and the previous / next file of the list.
 * `actions` adds the caller's own tools to the bar (send by e-mail…).
 */
export function FileViewer({
  files,
  at,
  onAt,
  actions,
}: {
  files: ViewerFile[];
  at: number | null;
  onAt: (i: number | null) => void;
  actions?: (f: ViewerFile) => ReactNode;
}) {
  const file = at === null ? null : files[at];
  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onAt(null)}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-neutral-950 p-0 text-white ring-0 sm:max-w-none"
      >
        {file && at !== null && (
          <ViewerBody
            key={file.id}
            file={file}
            at={at}
            count={files.length}
            go={(i) => onAt(i)}
            close={() => onAt(null)}
            actions={actions?.(file)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
