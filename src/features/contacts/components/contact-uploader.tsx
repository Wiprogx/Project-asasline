"use client";

import { CloudUpload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type DragEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { UploadQueue } from "@/components/shared/upload-queue";
import { Input } from "@/components/ui/input";
import { ALLOWED_TYPES, fileProblem } from "@/domain/files";
import { type Upload, useUploads } from "@/hooks/use-uploads";
import { cn } from "@/lib/utils";

/** The kind a file's name says ("passport-jan.pdf" → Passport), else the one chosen. */
const kindOf = (name: string, kinds: string[], chosen: string) =>
  kinds.find((k) => name.toLowerCase().includes(k.toLowerCase())) ?? chosen;

const filesOf = (list: FileList | null | undefined) => (list ? Array.from(list) : []);

/**
 * Keep papers on the contact: drop them on the zone, paste them (Ctrl+V), or browse — several
 * at once, each sent on its own with a progress bar, a retry and a cancel. The list below
 * refreshes as each one is kept.
 */
export function ContactUploader({ contactId, kinds }: { contactId: string; kinds: string[] }) {
  const router = useRouter();
  const [kind, setKind] = useState(kinds[0] ?? "");
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const onSettled = useCallback(
    (u: Upload) => {
      if (u.status === "done") {
        toast.success(u.message ?? `Kept — ${u.file.name}`);
        router.refresh();
      } else if (u.status === "failed") toast.error(u.message ?? "Not kept.");
    },
    [router],
  );
  const uploads = useUploads(`/api/contacts/${contactId}/files`, { check: fileProblem, onSettled });
  const { add } = uploads;

  const take = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      add(files, (f) => ({ kind: kindOf(f.name, kinds, kind), ...(note ? { note } : {}) }));
    },
    [add, kinds, kind, note],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = filesOf(e.clipboardData?.files);
      if (files.length === 0) return;
      e.preventDefault();
      take(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [take]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(filesOf(e.dataTransfer.files));
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <Field id="cf-kind" label="Kind of paper" hint="A kind in the file's name wins.">
          <NativeSelect
            id="cf-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            options={kinds.map((k) => ({ value: k, label: k }))}
          />
        </Field>
        <Field id="cf-note" label="Note">
          <Input
            id="cf-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Signed 2026-02-06"
            maxLength={300}
          />
        </Field>
      </div>
      <label
        htmlFor="cf-files"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "group grid cursor-pointer place-items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 hover:border-primary/60 hover:bg-muted/40",
          over && "border-primary bg-primary/5",
        )}
      >
        <CloudUpload
          className={cn(
            "size-9 text-muted-foreground transition-transform group-hover:-translate-y-0.5",
            over && "-translate-y-1 text-primary",
          )}
          aria-hidden
        />
        <span className="text-sm font-medium">
          {over ? "Let go to keep them" : "Drop papers here, paste them, or browse"}
        </span>
        <span className="text-xs text-muted-foreground">
          PDF, photo, sheet, Word, CSV, text or a mail · up to 25 MB each · several at once
        </span>
        <input
          id="cf-files"
          type="file"
          multiple
          aria-label="Add files"
          className="sr-only"
          accept={Object.keys(ALLOWED_TYPES).join(",")}
          onChange={(e) => {
            take(filesOf(e.target.files));
            e.target.value = "";
          }}
        />
      </label>
      <UploadQueue
        items={uploads.items}
        onRetry={uploads.retry}
        onCancel={uploads.cancel}
        onClear={uploads.clearFinished}
      />
    </div>
  );
}
