"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/** A Settings table edited as lines of text (ports, filing rules), saved with its version. */
export function LinesEditor({
  action,
  title,
  description,
  label,
  lines,
  version,
  count,
}: {
  action: Action;
  title: string;
  description: string;
  label: string;
  lines: string;
  version: number;
  count: number;
}) {
  const [state, run, pending] = useToastedAction(action);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={run} className="grid gap-3">
          <input type="hidden" name="version" value={version} />
          {/* Not re-keyed on the version: what the person typed stays theirs after a save. */}
          <Textarea
            name="lines"
            defaultValue={lines}
            rows={Math.min(Math.max(count + 2, 6), 24)}
            aria-label={label}
            className="font-mono text-sm"
          />
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {count} entries ·{" "}
              {version === 0 ? "built-in defaults, not yet saved" : `version ${version}`}
            </span>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
