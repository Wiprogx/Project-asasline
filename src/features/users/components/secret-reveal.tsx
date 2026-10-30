"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * A temporary password or a reset link, shown once: copied or read out, never sent by the
 * system itself (a temporary password goes by phone, not e-mail).
 */
export function SecretReveal({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/40 p-3" role="status">
      <span className="text-sm font-medium">{label}</span>
      <code className="font-mono text-base break-all select-all">{value}</code>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
    </div>
  );
}
