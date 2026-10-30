"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RouteStop } from "@/domain/route-service";
import { type PlaceKit, PlacePicker } from "./place-picker";

/**
 * "+ Add stop" (legacy stopRow): another place the truck calls at — one of the customer's
 * places like the loading address, or a new location made on the spot — and the day and hour
 * it is expected there.
 */
export function StopRows({
  label,
  stops,
  set,
  idPrefix,
  kit,
}: {
  label: string;
  stops: RouteStop[];
  set: (stops: RouteStop[]) => void;
  idPrefix: string;
  kit: PlaceKit;
}) {
  const put = (i: number, s: Partial<RouteStop>) =>
    set(stops.map((x, k) => (k === i ? { ...x, ...s } : x)));
  return (
    <div className="grid gap-2 sm:col-span-full">
      <span className="text-sm font-medium">{label}</span>
      {stops.map((s, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_9rem_6rem_auto] sm:items-end"
        >
          <PlacePicker
            id={`${idPrefix}-${i}`}
            label={`Stop ${i + 1}`}
            value={s.contactId || null}
            set={(v) => put(i, { contactId: v ?? "" })}
            kit={kit}
          />
          <Input
            id={`${idPrefix}-${i}-date`}
            type="date"
            aria-label={`Stop ${i + 1} date`}
            value={s.date ?? ""}
            onChange={(e) => put(i, { date: e.target.value || null })}
          />
          <Input
            id={`${idPrefix}-${i}-time`}
            type="time"
            aria-label={`Stop ${i + 1} hour`}
            value={s.time ?? ""}
            onChange={(e) => put(i, { time: e.target.value || null })}
          />
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
          onClick={() => set([...stops, { contactId: "", date: null, time: null }])}
        >
          + Add stop
        </Button>
      </div>
    </div>
  );
}
