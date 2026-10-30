"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoadingMode } from "@/domain/loading";
import {
  ROUTE_SERVICE_LABELS,
  ROUTE_SERVICES,
  type RouteService,
  type RouteStop,
} from "@/domain/route-service";

/** A destination being typed: what the server's destination schema reads. */
export type DestinationDraft = {
  laneId: string | null;
  service: RouteService;
  boxes: number;
  loadingMode: string | null;
  loadAddressId: string | null;
  stops: RouteStop[];
};

export const emptyDestination = (): DestinationDraft => ({
  laneId: null,
  service: "door_port",
  boxes: 1,
  loadingMode: null,
  loadAddressId: null,
  stops: [],
});

type Errors = Record<string, string[] | undefined> | undefined;

/** "+ Add stop": a location, and when the truck calls there (legacy stops). */
function StopRows({
  d,
  set,
  places,
}: {
  d: DestinationDraft;
  set: (d: DestinationDraft) => void;
  places: readonly PickerOption[];
}) {
  const put = (i: number, s: Partial<RouteStop>) =>
    set({ ...d, stops: d.stops.map((x, k) => (k === i ? { ...x, ...s } : x)) });
  return (
    <div className="grid gap-2 sm:col-span-full">
      <span className="text-sm font-medium">Additional addresses (Stops)</span>
      {d.stops.map((s, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_10rem_7rem_auto] sm:items-end">
          <SearchPicker
            id={`stop-${i}`}
            name={`stop-${i}`}
            aria-label={`Stop ${i + 1}`}
            options={places}
            defaultValue={s.contactId || null}
            placeholder="Search addresses…"
            onChange={(v) => put(i, { contactId: v ?? "" })}
          />
          <Input
            type="date"
            aria-label={`Stop ${i + 1} date`}
            value={s.date ?? ""}
            onChange={(e) => put(i, { date: e.target.value || null })}
          />
          <Input
            type="time"
            aria-label={`Stop ${i + 1} hour`}
            value={s.time ?? ""}
            onChange={(e) => put(i, { time: e.target.value || null })}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => set({ ...d, stops: d.stops.filter((_, k) => k !== i) })}
          >
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set({ ...d, stops: [...d.stops, { contactId: "", date: null, time: null }] })
          }
        >
          + Add stop
        </Button>
      </div>
    </div>
  );
}

/** What the loading mode means, under the field (legacy lmNote). */
const modeNote = (m: LoadingMode | undefined) =>
  !m
    ? "Pick one — the price depends on it."
    : m.drop
      ? "The container is left on site and collected later."
      : `${m.hours} loading hour${m.hours === 1 ? "" : "s"} included.`;

/**
 * One destination of a new quotation (legacy fQ): its service, the ocean leg it is built from,
 * how many containers, the loading mode agreed and — for a door service — where the truck loads.
 */
export function DestinationFields({
  d,
  set,
  lanes,
  modes,
  places,
  fe,
}: {
  d: DestinationDraft;
  set: (d: DestinationDraft) => void;
  lanes: readonly PickerOption[];
  modes: readonly LoadingMode[];
  places: readonly PickerOption[];
  fe: Errors;
}) {
  const door = d.service === "door_port";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="service" label="Service">
        <NativeSelect
          id="service"
          value={d.service}
          options={ROUTE_SERVICES.map((s) => ({ value: s, label: ROUTE_SERVICE_LABELS[s] }))}
          onChange={(e) => set({ ...d, service: e.target.value as RouteService })}
        />
      </Field>
      <Field
        id="laneId"
        label="Ocean leg"
        hint="Search by port, country or carrier"
        error={fe?.laneId}
        required
      >
        <SearchPicker
          id="laneId"
          name="laneId"
          options={lanes}
          defaultValue={d.laneId}
          placeholder="Search: Douala, CM, MSC…"
          empty="No ocean leg matches — add the route to the catalogue first."
          limit={50}
          onChange={(v) => set({ ...d, laneId: v })}
        />
      </Field>
      <Field id="boxes" label="How many containers" error={fe?.boxes}>
        <Input
          id="boxes"
          type="number"
          min={1}
          max={50}
          value={d.boxes}
          onChange={(e) => set({ ...d, boxes: Math.max(1, Number(e.target.value) || 1) })}
        />
      </Field>
      <Field
        id="loadingMode"
        label="Loading mode — agreed with the customer"
        hint={modeNote(modes.find((m) => m.name === d.loadingMode))}
      >
        <NativeSelect
          id="loadingMode"
          value={d.loadingMode ?? ""}
          placeholder="— not agreed yet —"
          options={modes.map((m) => ({ value: m.name, label: m.name }))}
          onChange={(e) => set({ ...d, loadingMode: e.target.value || null })}
        />
      </Field>
      {door && (
        <Field id="loadAddressId" label="Loading address" error={fe?.loadAddressId} required>
          <SearchPicker
            id="loadAddressId"
            name="loadAddressId"
            options={places}
            defaultValue={d.loadAddressId}
            placeholder="Search addresses…"
            empty="No location matches — add it as a location contact."
            onChange={(v) => set({ ...d, loadAddressId: v })}
          />
        </Field>
      )}
      {door && <StopRows d={d} set={set} places={places} />}
    </div>
  );
}
