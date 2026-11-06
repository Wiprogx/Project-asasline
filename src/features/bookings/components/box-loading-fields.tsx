"use client";

import { type ReactNode, useState } from "react";
import { Field } from "@/components/shared/field";
import { MomentField } from "@/components/shared/moment-field";
import { NativeSelect } from "@/components/shared/native-select";
import type { PickerOption } from "@/components/shared/search-picker";
import { type CustomerPlace, defaultLoadPlace, loadPlaces } from "@/domain/load-place";
import { isDropMode, type LoadingMode, modeNote, type Stop } from "@/domain/loading";
import { BoxStopRows } from "./box-stop-rows";
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
 * A day and an hour as one field on the quarter hour, as every moment of the loading card is
 * asked; it posts `<name>Date` and `<name>Time` as the server has always read them.
 */
function Moment({
  p,
  name,
  label,
  hint,
  date,
  time,
  fe,
}: {
  p: string;
  name: string;
  label: string;
  hint?: string;
  date: string | null;
  time: string | null;
  fe: Errors;
}) {
  return (
    <MomentField
      id={`${p}-${name}`}
      label={label}
      hint={hint}
      date={date}
      time={time}
      dateName={`${name}Date`}
      timeName={`${name}Time`}
      error={fe?.[`${name}Date`] ?? fe?.[`${name}Time`]}
      className="lg:col-span-2"
    />
  );
}

/**
 * Loading — this box only (legacy per-box loading card). Nothing here is inherited by the
 * other boxes: a missing detail prints as missing on the trucker copy, and the copy says so.
 * The loading address is a place: the booking's proposal — the customer's delivery address,
 * else its own — stands in the picker until another is chosen, and any location may be.
 * The mode decides the dates asked: direct loading has the day and hour the truck comes and
 * waits the hours included; a chassis or box left on site (a drop mode) has the day it is
 * delivered and the day it is picked back.
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
  const options = loadPlaces([...made, ...places.customer], places.locations);
  const add = (m: PickerOption) => setMade((ms) => [{ ...m, delivery: true }, ...ms]);
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
        options={options}
        ownerId={places.clientId}
        value={place}
        set={setPlace}
        made={add}
        before={box.loadAddress}
        dialog={places.newPlace}
        error={fe?.loadAddressId}
        className="lg:col-span-2"
      />
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
      <Moment
        p={p}
        name="load"
        label={drop ? "Delivered on" : "Loading date"}
        hint={
          drop
            ? "When the chassis or the box is put down at the address."
            : "When the truck comes; it waits the hours the mode includes."
        }
        date={box.loadDate}
        time={box.loadTime}
        fe={fe}
      />
      {drop ? (
        <Moment
          p={p}
          name="pickBack"
          label="Picked back on"
          hint="When the truck comes back for the loaded box."
          date={box.pickBackDate}
          time={box.pickBackTime}
          fe={fe}
        />
      ) : (
        <Moment
          p={p}
          name="loadEnd"
          label="Loading finished"
          hint="From the CMR, once loaded: compared with the hours the mode includes."
          date={box.loadEndDate}
          time={box.loadEndTime}
          fe={fe}
        />
      )}
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
      <BoxStopRows
        p={p}
        stops={box.stops}
        options={options}
        clientId={places.clientId}
        newPlace={places.newPlace}
        made={add}
        error={fe?.stops}
      />
    </fieldset>
  );
}
