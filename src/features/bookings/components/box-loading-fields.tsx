"use client";

import { useState } from "react";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isDropMode, type LoadingMode, modeNote, type Stop, stopLines } from "@/domain/loading";

export type BoxLoading = {
  loadAddress: string | null;
  loadDate: string | null;
  loadTime: string | null;
  loadingMode: string | null;
  transporterId: string | null;
  pickBackDate: string | null;
  pickBackTime: string | null;
  stops: Stop[];
};

type Errors = Record<string, string[] | undefined> | undefined;

/**
 * Loading — this box only (legacy per-box loading card). Nothing here is inherited by the
 * other boxes: a missing detail prints as missing on the trucker copy, and the copy says so.
 * A drop mode (box left on site) asks when the truck comes back for it.
 */
export function BoxLoadingFields({
  p,
  box,
  modes,
  truckers,
  fe,
}: {
  p: string;
  box: BoxLoading;
  modes: readonly LoadingMode[];
  truckers: readonly { id: string; name: string }[];
  fe: Errors;
}) {
  const [mode, setMode] = useState(box.loadingMode ?? "");
  const drop = isDropMode(modes, mode);
  return (
    <fieldset className="grid gap-3 rounded-md border p-3 sm:col-span-2 lg:col-span-6 lg:grid-cols-4">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Loading — this box only
      </legend>
      <Field
        id={`${p}-load-address`}
        label="Loading address"
        className="lg:col-span-2"
        error={fe?.loadAddress}
      >
        <Input
          id={`${p}-load-address`}
          name="loadAddress"
          defaultValue={box.loadAddress ?? ""}
          placeholder="Where this box is filled"
        />
      </Field>
      <Field
        id={`${p}-load-date`}
        label={drop ? "Dropped off on" : "Loading date"}
        error={fe?.loadDate}
      >
        <Input
          id={`${p}-load-date`}
          name="loadDate"
          type="date"
          defaultValue={box.loadDate ?? ""}
        />
      </Field>
      <Field id={`${p}-load-time`} label="Time" error={fe?.loadTime}>
        <Input
          id={`${p}-load-time`}
          name="loadTime"
          type="time"
          defaultValue={box.loadTime ?? ""}
        />
      </Field>
      <Field
        id={`${p}-mode`}
        label="Loading mode"
        className="lg:col-span-2"
        hint={mode ? modeNote(modes, mode) : "Same as the booking unless chosen here."}
        error={fe?.loadingMode}
      >
        <NativeSelect
          id={`${p}-mode`}
          name="loadingMode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          placeholder="— same as the booking —"
          options={modes.map((m) => ({ value: m.name, label: m.name }))}
        />
      </Field>
      <Field
        id={`${p}-trucker`}
        label="Trucker for this box"
        className="lg:col-span-2"
        error={fe?.transporterId}
      >
        <NativeSelect
          id={`${p}-trucker`}
          name="transporterId"
          defaultValue={box.transporterId ?? ""}
          placeholder="— Select trucker —"
          options={truckers.map((t) => ({ value: t.id, label: t.name }))}
        />
      </Field>
      {drop && (
        <>
          <Field
            id={`${p}-pick-date`}
            label="Picked back up — date"
            hint="The date above is when the box is dropped; only the collection changes."
            error={fe?.pickBackDate}
          >
            <Input
              id={`${p}-pick-date`}
              name="pickBackDate"
              type="date"
              defaultValue={box.pickBackDate ?? ""}
            />
          </Field>
          <Field id={`${p}-pick-time`} label="Picked back up — time" error={fe?.pickBackTime}>
            <Input
              id={`${p}-pick-time`}
              name="pickBackTime"
              type="time"
              defaultValue={box.pickBackTime ?? ""}
            />
          </Field>
        </>
      )}
      <Field
        id={`${p}-stops`}
        label="Extra stops for this box"
        className="lg:col-span-4"
        hint="One per line: address | date | time — the date and the hour are optional."
        error={fe?.stops}
      >
        <Textarea
          id={`${p}-stops`}
          name="stops"
          rows={2}
          defaultValue={stopLines(box.stops)}
          className="font-mono text-sm"
        />
      </Field>
    </fieldset>
  );
}
