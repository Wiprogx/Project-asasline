"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";
import { Input } from "@/components/ui/input";
import type { LoadingMode } from "@/domain/loading";
import {
  ROUTE_SERVICE_LABELS,
  ROUTE_SERVICES,
  type RouteBox,
  type RouteService,
  type RouteStop,
} from "@/domain/route-service";
import { BoxRows } from "./box-rows";
import { type PlaceKit, PlacePicker } from "./place-picker";
import { CommodityRows } from "./commodity-rows";
import { StopRows } from "./stop-rows";

/** A destination being typed: what the server's destination schema reads. */
export type DestinationDraft = {
  laneId: string | null;
  service: RouteService;
  boxes: number;
  loadingMode: string | null;
  loadAddressId: string | null;
  stops: RouteStop[];
  boxDetails: RouteBox[];
};

/** A container as it starts: the destination's loading, and an empty HS row to fill. */
const newBox = (loadingMode: string | null, loadAddressId: string | null): RouteBox => ({
  loadingMode,
  loadAddressId,
  stops: [],
  hs: [{ code: "", description: null }],
});

export const emptyDestination = (loadAddressId: string | null = null): DestinationDraft => ({
  laneId: null,
  service: "door_port",
  boxes: 1,
  loadingMode: null,
  loadAddressId,
  stops: [],
  boxDetails: [newBox(null, loadAddressId)],
});

type Errors = Record<string, string[] | undefined> | undefined;

/** What the loading mode means, under the field (legacy lmNote). */
const modeNote = (m: LoadingMode | undefined) =>
  !m
    ? "Pick one — the price depends on it."
    : m.drop
      ? "The container is left on site and collected later."
      : `${m.hours} loading hour${m.hours === 1 ? "" : "s"} included.`;

/**
 * A new container count (quotation > destination > container > HS): one entry per box, a new
 * one starting from the destination's mode and address (legacy qBoxRows); a single box is
 * loaded as the destination is.
 */
export function withBoxes(d: DestinationDraft, boxes: number): DestinationDraft {
  // Leaving one box for several: the first box takes the loading typed for the destination.
  const first = d.boxDetails[0];
  const was =
    d.boxes === 1 && first
      ? [
          {
            ...first,
            loadingMode: d.loadingMode,
            loadAddressId: d.loadAddressId,
            stops: d.stops,
          },
        ]
      : d.boxDetails;
  const boxDetails = Array.from(
    { length: boxes },
    (_, i) => was[i] ?? newBox(d.loadingMode, d.loadAddressId),
  );
  return { ...d, boxes, boxDetails };
}

/** The loading of a one-container destination: its mode, its address, its stops. */
function OneBox({
  d,
  set,
  modes,
  kit,
  hs,
  fe,
}: {
  d: DestinationDraft;
  set: (d: DestinationDraft) => void;
  modes: readonly LoadingMode[];
  kit: PlaceKit;
  hs: readonly PickerOption[];
  fe: Errors;
}) {
  const box = d.boxDetails[0] ?? newBox(d.loadingMode, d.loadAddressId);
  return (
    <>
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
      {d.service === "door_port" && (
        <>
          <PlacePicker
            id="loadAddressId"
            label="Loading address"
            value={d.loadAddressId}
            set={(v) => set({ ...d, loadAddressId: v })}
            kit={kit}
            error={fe?.loadAddressId}
          />
          <StopRows
            label="Additional addresses (Stops)"
            idPrefix="stop"
            stops={d.stops}
            set={(stops) => set({ ...d, stops })}
            kit={kit}
          />
        </>
      )}
      <CommodityRows
        idPrefix="hs"
        rows={box.hs}
        set={(rows) => set({ ...d, boxDetails: [{ ...box, hs: rows }] })}
        hs={hs}
      />
    </>
  );
}

/**
 * One destination of a new quotation (legacy fQ): its service, the ocean leg it is built from,
 * how many containers, and how each is loaded — for a door service, where the truck loads.
 */
export function DestinationFields({
  d,
  set,
  lanes,
  modes,
  kit,
  hs,
  fe,
}: {
  d: DestinationDraft;
  set: (d: DestinationDraft) => void;
  lanes: readonly PickerOption[];
  modes: readonly LoadingMode[];
  kit: PlaceKit;
  hs: readonly PickerOption[];
  fe: Errors;
}) {
  const many = d.service === "door_port" && d.boxes > 1;
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
          onChange={(e) => set(withBoxes(d, Math.max(1, Number(e.target.value) || 1)))}
        />
      </Field>
      {many ? (
        <BoxRows
          boxes={d.boxDetails}
          set={(boxDetails) => set({ ...d, boxDetails })}
          modes={modes}
          kit={kit}
          hs={hs}
        />
      ) : (
        <OneBox d={d} set={set} modes={modes} kit={kit} hs={hs} fe={fe} />
      )}
    </div>
  );
}
