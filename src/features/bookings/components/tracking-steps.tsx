"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { journey, type TrackStep } from "@/domain/release";
import { useToastedAction } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";
import { toggleTrackStep } from "../release-actions";
import { trackStepSchema } from "../schemas";

/**
 * The journey's milestones (legacy Tracking tab): each ticked by hand, with the day it was
 * done; the "auto" ones will be fed by the carrier later and are confirmed by hand until then.
 * Above them, where each box is right now, in one line.
 */
export function TrackingSteps({
  id,
  version,
  track,
  boxes,
  canEdit,
}: {
  id: string;
  version: number;
  track: readonly TrackStep[];
  boxes: readonly { id: string; number: string | null; seals: number }[];
  canEdit: boolean;
}) {
  const [, run, pending] = useToastedAction(toggleTrackStep, undefined, trackStepSchema);
  const { next, current, stage } = journey(track);
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Journey</CardTitle>
        <CardDescription>
          {boxes.length === 0
            ? "No numbered container yet."
            : boxes.map((b) => (
                <span key={b.id} className="mr-4 inline-flex items-center gap-2">
                  <span className="font-mono font-medium">{b.number}</span>
                  <span>{stage}</span>
                  {current?.date && <span>· {current.date}</span>}
                  {b.seals > 0 && <span>· 🔒 {b.seals}</span>}
                </span>
              ))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-1" aria-label="Journey status">
          {track.map((t, i) => (
            <li
              key={t.name}
              aria-current={i === next ? "step" : undefined}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm",
                t.done && "border-success/40 bg-success/5",
                i === next && "border-primary",
              )}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className={cn("font-medium", t.done && "line-through-none")}>
                  {t.done ? "✓ " : ""}
                  {t.name}
                </span>
                <span className="rounded border px-1 text-[10px] text-muted-foreground uppercase">
                  {t.source === "auto" ? "Auto" : "Manual"}
                </span>
                <span className="text-muted-foreground">
                  {[t.place, t.date].filter(Boolean).join(" · ") ||
                    (i === next ? "In progress" : t.done ? "" : "Pending")}
                </span>
              </span>
              {canEdit && (
                <ActionForm action={run} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="version" value={version} />
                  <input type="hidden" name="index" value={i} />
                  <Button type="submit" size="sm" variant="outline" disabled={pending}>
                    {t.done ? "Undo" : "Confirm"}
                  </Button>
                </ActionForm>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
