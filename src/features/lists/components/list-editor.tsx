"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";
import { IDLE } from "@/lib/action-result";
import { saveList } from "../actions";
import { LIST_META } from "../schemas";

/** One entry per line; blanks and duplicates are dropped on save. */
export function ListEditor({
  name,
  values,
  version,
}: {
  name: string;
  values: string[];
  version: number;
}) {
  const [state, action, pending] = useActionState(saveList, IDLE);
  useActionToast(state);
  const meta = LIST_META[name] ?? { title: name, description: "" };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.title}</CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="version" value={version} />
          <Textarea
            key={version}
            name="values"
            defaultValue={values.join("\n")}
            rows={Math.min(Math.max(values.length + 1, 4), 14)}
            aria-label={`${meta.title}, one per line`}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              One per line ·{" "}
              {version === 0 ? "built-in defaults, not yet saved" : `version ${version}`}
            </span>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
