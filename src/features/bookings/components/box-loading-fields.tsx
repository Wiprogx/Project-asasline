"use client";

import { type ReactNode, useState } from "react";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import type { PickerOption } from "@/components/shared/search-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type CustomerPlace, defaultLoadPlace, loadPlaces } from "@/domain/load-place";
import { isDropMode, type LoadingMode, modeNote, type Stop, stopLines } from "@/domain/loading";
import { PlaceField } from "./place-field";

export type BoxLoading = {
  /** The place this box is loaded at (domain/load-place); the words beside it are written from it. */
  loadAddressId: string | null;
  loadAddress: string | null;
  loadDate: string | null;
  loadTime: string | null;
  loadingMode: string | null;
  transporterId: string | null;
  loadEndDate: string | null;
  loadEndTime: string | null;
  pickBackDate: string | null;
  pickBackTime: string | null;
  stops: Stop[];
};

/** Where a box may be loaded, what is proposed, and how a new place is made. */
export type LoadPlaces = {
  /** The customer's places, its delivery address first (contacts placesOf). */
  customer: readonly CustomerPlace[];
  /** Every other live location: a box may well be loaded at a place of another contact. */
  locations: readonly PickerOption[];
  clientId: string | null;
  /** What the booking proposes for its boxes: the place it was made or quoted with. */
  proposed: string | null;
  /** "+ New location", rendered by the page (it lives with the contacts). */
  newPlace?: ReactNode;
};

type Errors = Record<string, string[] | undefined> | undefined;

/**
 * Loading — this box only (legacy per-box loading card). Nothing here is inherited by the
 * other boxes: a missing detail prints as missing on the trucker copy, and the copy says so.
 * The loading address is a place: the booking's proposal — the customer's delivery address,
 * else its own — stands in the picker until another is chosen, and any location may be.
 * A drop mode (box left on site) asks when the truck comes back for it.
 */
export function BoxLoadingFields({
  p,
  box,
  modes,
  truckers,
  places,
  fe,
}: {
  p: string;
  box: BoxLoading;
  modes: readonly LoadingMode[];
  truckers: readonly { id: string; name: string }[];
  places: LoadPlaces;
  fe: Errors;
}) {
  const [mode, setMode] = useState(box.loadingMode ?? "");
  const drop = isDropMode(modes, mode);
  // A box from before keeps the words it carried until a place is chosen for it.
  const [place, setPlace] = useState<string | null>(
    box.loadAddressId ??
      (box.loadAddress
        ? null
        : (places.proposed ?? defaultLoadPlace(places.customer, places.clientId))),
  );
  const [made, setMade] = useState<CustomerPlace[]>([]);
  return (
    <fieldset className="grid gap-3 rounded-md border p-3 sm:col-span-2 lg:col-span-6 lg:grid-cols-4">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Loading — this box only
      </legend>
      <PlaceField
        id={`${p}-load-address`}
        name="loadAddressId"
        label="Loading address"
        hint="The customer's places first, its delivery address proposed; any other location after."
        options={loadPlaces([...made, ...places.customer], places.locations)}
        ownerId={places.clientId}
        value={place}
        set={setPlace}
        made={(m) => setMade((ms) => [{ ...m, delivery: true }, ...ms])}
        before={box.loadAddress}
        dialog={places.newPlace}
        error={fe?.loadAddressId}
        className="lg:col-span-2"
      />
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
      {!drop && (
        <>
          <Field
            id={`${p}-end-date`}
            label="Loading finished — date"
            hint="From the CMR: compared with the hours the mode includes."
            error={fe?.loadEndDate}
          >
            <Input
              id={`${p}-end-date`}
              name="loadEndDate"
              type="date"
              defaultValue={box.loadEndDate ?? ""}
            />
          </Field>
          <Field id={`${p}-end-time`} label="Loading finished — time" error={fe?.loadEndTime}>
            <Input
              id={`${p}-end-time`}
              name="loadEndTime"
              type="time"
              defaultValue={box.loadEndTime ?? ""}
            />
          </Field>
        </>
      )}
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
