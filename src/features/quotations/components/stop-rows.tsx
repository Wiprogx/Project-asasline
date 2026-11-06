"use client";

import { Field } from "@/components/shared/field";
import { MomentInput } from "@/components/shared/moment-input";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { isDropMode, type LoadingMode } from "@/domain/loading";
import type { RouteStop } from "@/domain/route-service";
import { type PlaceKit, PlacePicker } from "./place-picker";

/**
 * "+ Add stop" (legacy stopRow): another place the truck calls at — one of the customer's
 * places like the loading address, or a new location made on the spot — how the box is handled
 * there (a loading mode of its own), and the day and hour it is expected there, asked as one
 * field on the quarter hour. Under a drop mode the stop asks, as the box does, when the box is
 * delivered there and when it is picked back.
 */
export function StopRows({
  label,
  stops,
  set,
  idPrefix,
  kit,
  modes,
}: {
  label: string;
  stops: RouteStop[];
  set: (stops: RouteStop[]) => void;
  idPrefix: string;
  kit: PlaceKit;
  modes: readonly LoadingMode[];
}) {
  const put = (i: number, s: Partial<RouteStop>) =>
    set(stops.map((x, k) => (k === i ? { ...x, ...s } : x)));
  const dropped = (s: RouteStop) => isDropMode(modes, s.loadingMode);
  return (
    <div className="grid gap-2 sm:col-span-full">
      <span className="text-sm font-medium">{label}</span>
      {stops.map((s, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_12rem_auto_auto] sm:items-end"
        >
          <PlacePicker
            id={`${idPrefix}-${i}`}
            label={`Stop ${i + 1}`}
            value={s.contactId || null}
            set={(v) => put(i, { contactId: v ?? "" })}
            kit={kit}
          />
          <Field id={`${idPrefix}-${i}-mode`} label={`Stop ${i + 1} loading mode`}>
            <NativeSelect
              id={`${idPrefix}-${i}-mode`}
              value={s.loadingMode ?? ""}
              placeholder="— not agreed yet —"
              options={modes.map((m) => ({ value: m.name, label: m.name }))}
              onChange={(e) => put(i, { loadingMode: e.target.value || null })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <MomentInput
              id={`${idPrefix}-${i}-when`}
              aria-label={dropped(s) ? `Stop ${i + 1} delivered on` : `Stop ${i + 1} date and hour`}
              date={s.date}
              time={s.time}
              onChange={(date, time) => put(i, { date, time })}
            />
            {dropped(s) && (
              <MomentInput
                id={`${idPrefix}-${i}-pickBack`}
                aria-label={`Stop ${i + 1} picked back on`}
                date={s.pickBackDate ?? null}
                time={s.pickBackTime ?? null}
                onChange={(pickBackDate, pickBackTime) => put(i, { pickBackDate, pickBackTime })}
              />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => set(stops.filter((_, k) => k !== i))}
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
            set([...stops, { contactId: "", date: null, time: null, loadingMode: null }])
          }
        >
          + Add stop
        </Button>
      </div>
    </div>
  );
}
