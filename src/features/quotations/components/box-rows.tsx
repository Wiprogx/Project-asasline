"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import type { LoadingMode } from "@/domain/loading";
import type { RouteBox } from "@/domain/route-service";
import type { PickerOption } from "@/components/shared/search-picker";
import { CommodityRows } from "./commodity-rows";
import { type PlaceKit, PlacePicker } from "./place-picker";
import { StopRows } from "./stop-rows";

/**
 * "Each container — asked separately" (legacy qb-row): with two containers or more, each box
 * carries its own loading mode, address and stops into the one booking of the destination.
 */
export function BoxRows({
  boxes,
  set,
  modes,
  kit,
  hs,
}: {
  boxes: RouteBox[];
  set: (boxes: RouteBox[]) => void;
  modes: readonly LoadingMode[];
  kit: PlaceKit;
  hs: readonly PickerOption[];
}) {
  const put = (i: number, b: Partial<RouteBox>) =>
    set(boxes.map((x, k) => (k === i ? { ...x, ...b } : x)));
  return (
    <div className="grid gap-3 sm:col-span-full">
      <span className="text-sm font-medium">Each container — asked separately</span>
      {boxes.map((b, i) => (
        <div key={i} className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
          <span className="text-xs font-semibold tracking-wide uppercase sm:col-span-full">
            Box {i + 1}
          </span>
          <Field id={`box-${i}-mode`} label={`Box ${i + 1} loading mode`}>
            <NativeSelect
              id={`box-${i}-mode`}
              value={b.loadingMode ?? ""}
              placeholder="— not agreed yet —"
              options={modes.map((m) => ({ value: m.name, label: m.name }))}
              onChange={(e) => put(i, { loadingMode: e.target.value || null })}
            />
          </Field>
          <PlacePicker
            id={`box-${i}-load`}
            label={`Box ${i + 1} loading address`}
            value={b.loadAddressId}
            set={(v) => put(i, { loadAddressId: v })}
            kit={kit}
          />
          <StopRows
            label={`Extra stops for box ${i + 1}`}
            idPrefix={`box-${i}-stop`}
            stops={b.stops}
            set={(stops) => put(i, { stops })}
            kit={kit}
          />
          <CommodityRows
            idPrefix={`box-${i}-hs`}
            label={`Box ${i + 1} commodity (HS) — one row per product`}
            rows={b.hs}
            set={(rows) => put(i, { hs: rows })}
            hs={hs}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Every charge is per container. The destination stays one booking; each box carries its own
        loading mode, address and stops into it.
      </p>
    </div>
  );
}
