"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccessWatch } from "@/domain/access";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveAccessWatch } from "../access-actions";

/** Which acts of looking are recorded (legacy ACCESS_WATCH): one switch per kind. */
export function AccessWatchForm({ watch, version }: { watch: AccessWatch[]; version: number }) {
  const [, run, pending] = useToastedAction(saveAccessWatch);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Which acts of looking are recorded</CardTitle>
        <CardDescription>
          Edits are written on the record itself; this holds what would otherwise leave no trace.
          Opening a booking or a contact is never recorded — a person working normally would bury
          everything worth reading.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={run} className="grid gap-3">
          <input type="hidden" name="version" value={version} />
          <ul className="grid gap-2 text-sm">
            {watch.map((w) => (
              <li key={w.key}>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name={w.key} defaultChecked={w.on} className="size-4" />
                  {w.label}
                </label>
              </li>
            ))}
          </ul>
          <div>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? "Saving…" : "Save what is recorded"}
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
