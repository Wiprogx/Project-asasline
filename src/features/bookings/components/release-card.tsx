"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type ReleaseState, releaseState, releaseTone } from "@/domain/release";
import { useToastedAction } from "@/hooks/use-action-toast";
import { setRelease } from "../release-actions";
import { releaseSchema } from "../schemas";

/**
 * Where the shipment stands for the consignee (legacy release sheet): a hold blocks collection
 * until somebody here lifts it, and says who asked and what must happen.
 */
export function ReleaseCard({
  id,
  version,
  release,
  releaseById,
  releaseNote,
  states,
  contacts,
  canEdit,
}: {
  id: string;
  version: number;
  release: string;
  releaseById: string | null;
  releaseNote: string | null;
  states: readonly ReleaseState[];
  contacts: readonly { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [state, run, pending] = useToastedAction(setRelease, undefined, releaseSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const current = releaseState(states, release);
  const [code, setCode] = useState(current.code);
  const chosen = releaseState(states, code);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Release
          <ToneBadge tone={releaseTone(current)}>{current.label}</ToneBadge>
        </CardTitle>
        <CardDescription>
          {current.hint}
          {current.hold && releaseNote ? ` — ${releaseNote}` : ""}
        </CardDescription>
      </CardHeader>
      {canEdit && (
        <CardContent>
          <ActionForm action={run} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={version} />
            <Field
              id="release"
              label="Where it stands today"
              hint={chosen.hint}
              error={fe?.release}
              className="sm:col-span-2"
            >
              <NativeSelect
                id="release"
                name="release"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                options={states.map((s) => ({
                  value: s.code,
                  label: `${s.hold ? "⛔ " : ""}${s.label}`,
                }))}
              />
            </Field>
            {chosen.hold && (
              <>
                <Field id="releaseById" label="Who asked for the hold" error={fe?.releaseById}>
                  <NativeSelect
                    id="releaseById"
                    name="releaseById"
                    defaultValue={releaseById ?? ""}
                    placeholder="— Shipper, carrier or ourselves —"
                    options={contacts.map((c) => ({ value: c.id, label: c.name }))}
                  />
                </Field>
                <Field id="releaseNote" label="What must happen to lift it" error={fe?.releaseNote}>
                  <Input
                    id="releaseNote"
                    name="releaseNote"
                    defaultValue={releaseNote ?? ""}
                    placeholder="Shipper confirms payment received"
                  />
                </Field>
              </>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Set release status"}
              </Button>
            </div>
          </ActionForm>
        </CardContent>
      )}
    </Card>
  );
}
