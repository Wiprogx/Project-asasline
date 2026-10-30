"use client";

import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Mail,
  RotateCw,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Upload } from "@/hooks/use-uploads";
import { cn } from "@/lib/utils";

export const fileSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** A photo shows itself; anything else, the icon of its kind. */
function Thumb({ file }: { file: File }) {
  if (file.type.startsWith("image/"))
    return (
      <span
        aria-hidden
        className="size-10 shrink-0 rounded-md border bg-cover bg-center"
        ref={(el) => {
          if (!el) return;
          const u = URL.createObjectURL(file);
          el.style.backgroundImage = `url("${u}")`;
          return () => URL.revokeObjectURL(u);
        }}
      />
    );
  const n = file.name.toLowerCase();
  const Icon = /\.(xlsx?|csv)$/.test(n)
    ? FileSpreadsheet
    : /\.(eml|msg)$/.test(n)
      ? Mail
      : FileText;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

function Status({ u }: { u: Upload }) {
  if (u.status === "uploading")
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.round(u.progress * 100)}%
      </span>
    );
  if (u.status === "done")
    return (
      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Kept" />
    );
  return <TriangleAlert className="size-4 text-destructive" aria-label="Not kept" />;
}

function Row({ u, onRetry, onCancel }: { u: Upload; onRetry: () => void; onCancel: () => void }) {
  const failed = u.status === "failed" || u.status === "cancelled";
  return (
    <li className="flex items-center gap-3 py-2">
      <Thumb file={u.file} />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium">{u.file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {fileSize(u.file.size)}
            {u.fields.kind ? ` · ${u.fields.kind}` : ""}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`Sending ${u.file.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(u.progress * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-200",
              failed ? "bg-destructive" : u.status === "done" ? "bg-emerald-600" : "bg-primary",
            )}
            style={{ width: `${failed ? 100 : Math.max(2, u.progress * 100)}%` }}
          />
        </div>
        {failed && u.message && <p className="text-xs text-destructive">{u.message}</p>}
      </div>
      <Status u={u} />
      {u.status === "uploading" && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
          aria-label={`Cancel ${u.file.name}`}
        >
          <X />
        </Button>
      )}
      {failed && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRetry}
          aria-label={`Retry ${u.file.name}`}
        >
          <RotateCw />
        </Button>
      )}
    </li>
  );
}

/** What the uploader is sending, has kept, or could not keep, newest first. */
export function UploadQueue({
  items,
  onRetry,
  onCancel,
  onClear,
}: {
  items: Upload[];
  onRetry: (u: Upload) => void;
  onCancel: (id: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  const busy = items.filter((u) => u.status === "uploading").length;
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="polite">
          {busy > 0 ? `Sending ${busy} of ${items.length}…` : `${items.length} sent this visit`}
        </span>
        {busy < items.length && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear finished
          </Button>
        )}
      </div>
      <ul className="divide-y">
        {items.map((u) => (
          <Row key={u.id} u={u} onRetry={() => onRetry(u)} onCancel={() => onCancel(u.id)} />
        ))}
      </ul>
    </div>
  );
}
