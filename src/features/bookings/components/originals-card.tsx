"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { NewTab } from "@/components/shared/new-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type SendMode, trackingUrl } from "@/domain/release";
import { useToastedAction } from "@/hooks/use-action-toast";
import { setOriginals } from "../release-actions";
import { originalsSchema } from "../schemas";

/**
 * How the original papers travel (legacy originals block): who receives them, by which
 * courier, when, under which waybill — with the courier's own tracking page when it has one.
 */
export function OriginalsCard({
  id,
  version,
  docType,
  paper,
  docReceiverId,
  sendMode,
  sendDate,
  sendTracking,
  modes,
  contacts,
  canEdit,
}: {
  id: string;
  version: number;
  docType: string;
  /** Whether this document type travels on paper (Settings › Lists › Paper documents). */
  paper: boolean;
  docReceiverId: string | null;
  sendMode: string | null;
  sendDate: string | null;
  sendTracking: string | null;
  modes: readonly SendMode[];
  contacts: readonly { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [state, run, pending] = useToastedAction(setOriginals, undefined, originalsSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const [mode, setMode] = useState(sendMode ?? "");
  const tracks = modes.find((m) => m.name === mode)?.tracks ?? false;
  const url = trackingUrl(modes, sendMode, sendTracking);
  const receiver = contacts.find((c) => c.id === docReceiverId)?.name;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Originals</CardTitle>
        <CardDescription>
          {paper
            ? `${docType}: the originals travel on paper.`
            : `${docType}: an electronic document — nothing to send, unless the customer asks for paper.`}
          {sendDate &&
            ` Sent ${sendDate}${sendMode ? ` by ${sendMode}` : ""}${receiver ? ` to ${receiver}` : ""}.`}
          {url && (
            <>
              {" "}
              <a href={url} target="_blank" rel="noopener" className="underline underline-offset-4">
                Track {sendTracking}
                <NewTab />
              </a>
            </>
          )}
        </CardDescription>
      </CardHeader>
      {canEdit && (
        <CardContent>
          <ActionForm action={run} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={version} />
            <Field id="docReceiverId" label="Who receives the originals" error={fe?.docReceiverId}>
              <NativeSelect
                id="docReceiverId"
                name="docReceiverId"
                defaultValue={docReceiverId ?? ""}
                placeholder="— Select —"
                options={contacts.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field id="sendMode" label="Sent by" error={fe?.sendMode}>
              <NativeSelect
                id="sendMode"
                name="sendMode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                placeholder="— Not sent yet —"
                options={modes.map((m) => ({ value: m.name, label: m.name }))}
              />
            </Field>
            <Field id="sendDate" label="Sent on" error={fe?.sendDate}>
              <Input id="sendDate" name="sendDate" type="date" defaultValue={sendDate ?? ""} />
            </Field>
            {tracks && (
              <Field id="sendTracking" label="Waybill / tracking number" error={fe?.sendTracking}>
                <Input
                  id="sendTracking"
                  name="sendTracking"
                  defaultValue={sendTracking ?? ""}
                  className="font-mono"
                  placeholder="DHL waybill n°"
                />
              </Field>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Note the originals"}
              </Button>
            </div>
          </ActionForm>
        </CardContent>
      )}
    </Card>
  );
}
