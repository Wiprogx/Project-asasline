"use client";

import { type ReactNode, useState } from "react";
import { Field } from "@/components/shared/field";
import { MomentInput } from "@/components/shared/moment-input";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import type { PickerOption } from "@/components/shared/search-picker";
import { isDropMode, type LoadingMode, type Stop } from "@/domain/loading";
import { PlaceField } from "./place-field";

type Row = {
  key: number;
  placeId: string | null;
  before: string | null;
  date: string;
  time: string;
  mode: string;
  pickBackDate: string;
  pickBackTime: string;
};

const rowsOf = (stops: readonly Stop[]): Row[] =>
  stops.map((s, key) => ({
    key,
    placeId: s.placeId ?? null,
    before: s.placeId ? null : s.address,
    date: s.date ?? "",
    time: s.time ?? "",
    mode: s.loadingMode ?? "",
    pickBackDate: s.pickBackDate ?? "",
    pickBackTime: s.pickBackTime ?? "",
  }));

const blankRow = (key: number): Row => ({
  key,
  placeId: null,
  before: null,
  date: "",
  time: "",
  mode: "",
  pickBackDate: "",
  pickBackTime: "",
});

/**
 * "+ Add stop" (legacy stopRow): another place the truck calls at for this box — picked as the
 * loading address is, the customer's places first, any other location or "+ New location" — how
 * the box is handled there (a loading mode of its own) and the day and hour it is expected there;
 * under a drop mode, as the box itself, when it is delivered there and when it is picked back.
 * Not every box has one. Each row posts `stopPlaceId`, `stopDate`, `stopTime`, `stopMode`,
 * `stopPickBackDate` and `stopPickBackTime` once (the pick-back empty when the mode asks none, so
 * the rows stay aligned); a stop from before shows the words it carried until a place is chosen.
 */
export function BoxStopRows({
  p,
  stops,
  options,
  clientId,
  newPlace,
  made,
  error,
  modes,
}: {
  p: string;
  stops: readonly Stop[];
  options: readonly PickerOption[];
  modes: readonly LoadingMode[];
  /** The customer a new place is linked under, and the "+ New location" dialog. */
  clientId: string | null;
  newPlace?: ReactNode;
  made: (o: PickerOption) => void;
  error?: string[];
}) {
  const [rows, setRows] = useState<Row[]>(() => rowsOf(stops));
  const [next, setNext] = useState(stops.length);
  const put = (key: number, r: Partial<Row>) =>
    setRows((rs) => rs.map((x) => (x.key === key ? { ...x, ...r } : x)));
  return (
    <div className="grid gap-2 lg:col-span-4">
      <span className="text-sm font-medium">Extra stops for this box</span>
      {rows.map((r, i) => (
        <div
          key={r.key}
          className="grid gap-2 rounded-md border p-2 lg:grid-cols-[1fr_12rem_auto_auto] lg:items-end"
        >
          <PlaceField
            id={`${p}-stop-${i}`}
            name="stopPlaceId"
            label={`Stop ${i + 1}`}
            hint="Where the truck calls on the way: the customer's places first, any other location after."
            options={options}
            ownerId={clientId}
            value={r.placeId}
            set={(v) => put(r.key, { placeId: v })}
            made={made}
            before={r.before}
            dialog={newPlace}
            error={i === 0 ? error : undefined}
          />
          <Field id={`${p}-stop-${i}-mode`} label={`Stop ${i + 1} loading mode`}>
            <NativeSelect
              id={`${p}-stop-${i}-mode`}
              name="stopMode"
              value={r.mode}
              placeholder="— not agreed yet —"
              options={modes.map((m) => ({ value: m.name, label: m.name }))}
              onChange={(e) => put(r.key, { mode: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <MomentInput
              id={`${p}-stop-${i}-when`}
              aria-label={
                isDropMode(modes, r.mode)
                  ? `Stop ${i + 1} delivered on`
                  : `Stop ${i + 1} date and hour`
              }
              date={r.date || null}
              time={r.time || null}
              onChange={(date, time) => put(r.key, { date: date ?? "", time: time ?? "" })}
              dateName="stopDate"
              timeName="stopTime"
            />
            {isDropMode(modes, r.mode) ? (
              <MomentInput
                id={`${p}-stop-${i}-pickBack`}
                aria-label={`Stop ${i + 1} picked back on`}
                date={r.pickBackDate || null}
                time={r.pickBackTime || null}
                onChange={(pickBackDate, pickBackTime) =>
                  put(r.key, { pickBackDate: pickBackDate ?? "", pickBackTime: pickBackTime ?? "" })
                }
                dateName="stopPickBackDate"
                timeName="stopPickBackTime"
              />
            ) : (
              <>
                <input type="hidden" name="stopPickBackDate" value="" />
                <input type="hidden" name="stopPickBackTime" value="" />
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
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
          onClick={() => {
            setRows((rs) => [...rs, blankRow(next)]);
            setNext((n) => n + 1);
          }}
        >
          + Add stop
        </Button>
      </div>
    </div>
  );
}
