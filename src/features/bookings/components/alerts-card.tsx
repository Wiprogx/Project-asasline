"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ALERT_LEVELS, ALERT_META, type AlertLevel } from "@/domain/alerts";
import { useToastedAction } from "@/hooks/use-action-toast";
import { raiseAlert, resolveAlert } from "../alert-actions";
import { raiseAlertSchema, resolveAlertSchema } from "../alert-schemas";

type Alert = { id: string; level: AlertLevel; text: string; by: string | null; on: string };

function Resolve({ bookingId, alertId }: { bookingId: string; alertId: string }) {
  const [, run, pending] = useToastedAction(resolveAlert, undefined, resolveAlertSchema);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="alertId" value={alertId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        Resolve
      </Button>
    </ActionForm>
  );
}

/**
 * The booking's open alerts (legacy Alerts block): the most serious first, each resolved when it
 * no longer holds; a new one says how serious it is and what it is about.
 */
export function AlertsCard({
  bookingId,
  alerts,
  canEdit,
}: {
  bookingId: string;
  alerts: Alert[];
  canEdit: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useToastedAction(
    raiseAlert,
    () => form.current?.reset(),
    raiseAlertSchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts{alerts.length ? ` (${alerts.length})` : ""}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts.</p>
        ) : (
          <ul className="grid gap-2" aria-label="Open alerts">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <ToneBadge tone={ALERT_META[a.level].tone}>{ALERT_META[a.level].label}</ToneBadge>
                  {a.text}
                  <span className="text-xs text-muted-foreground">
                    {[a.by, a.on].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {canEdit && <Resolve bookingId={bookingId} alertId={a.id} />}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <ActionForm
            ref={form}
            action={run}
            className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="bookingId" value={bookingId} />
            <Field id="alert-level" label="Level">
              <NativeSelect
                id="alert-level"
                name="level"
                defaultValue="alert"
                options={ALERT_LEVELS.map((l) => ({ value: l, label: ALERT_META[l].label }))}
              />
            </Field>
            <Field id="alert-text" label="Alert" error={fe?.text}>
              <Input
                id="alert-text"
                name="text"
                required
                placeholder="Customs pulled the box for a scan"
              />
            </Field>
            <Button type="submit" size="sm" disabled={pending}>
              Raise alert
            </Button>
          </ActionForm>
        )}
      </CardContent>
    </Card>
  );
}
