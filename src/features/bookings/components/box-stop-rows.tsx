"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PickerOption } from "@/components/shared/search-picker";
import type { Stop } from "@/domain/loading";
import { PlaceField } from "./place-field";

type Row = {
  key: number;
  placeId: string | null;
  before: string | null;
  date: string;
  time: string;
};

const rowsOf = (stops: readonly Stop[]): Row[] =>
  stops.map((s, key) => ({
    key,
    placeId: s.placeId ?? null,
    before: s.placeId ? null : s.address,
    date: s.date ?? "",
    time: s.time ?? "",
  }));

/**
 * "+ Add stop" (legacy stopRow): another place the truck calls at for this box — picked as the
 * loading address is, the customer's places first, any other location or "+ New location" — and
 * the day and hour it is expected there. Not every box has one. Each row posts `stopPlaceId`,
 * `stopDate` and `stopTime` once; a stop from before shows the words it carried until a place is
 * chosen for it.
 */
export function BoxStopRows({
  p,
  stops,
  options,
  clientId,
  newPlace,
  made,
  error,
}: {
  p: string;
  stops: readonly Stop[];
  options: readonly PickerOption[];
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
          className="grid gap-2 rounded-md border p-2 lg:grid-cols-[1fr_9rem_6rem_auto] lg:items-end"
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
          <Input
            id={`${p}-stop-${i}-date`}
            name="stopDate"
            type="date"
            aria-label={`Stop ${i + 1} date`}
            value={r.date}
            onChange={(e) => put(r.key, { date: e.target.value })}
          />
          <Input
            id={`${p}-stop-${i}-time`}
            name="stopTime"
            type="time"
            aria-label={`Stop ${i + 1} hour`}
            value={r.time}
            onChange={(e) => put(r.key, { time: e.target.value })}
          />
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
            setRows((rs) => [
              ...rs,
              { key: next, placeId: null, before: null, date: "", time: "" },
            ]);
            setNext((n) => n + 1);
          }}
        >
          + Add stop
        </Button>
      </div>
    </div>
  );
}
