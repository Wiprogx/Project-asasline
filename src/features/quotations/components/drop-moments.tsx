"use client";

import { Field } from "@/components/shared/field";
import { MomentInput } from "@/components/shared/moment-input";
import { isDropMode, type LoadingMode } from "@/domain/loading";
import type { RouteBox } from "@/domain/route-service";

/**
 * The moments a drop mode agrees at quotation stage, as the booking's loading card asks them
 * (bookings box-loading-fields): when the chassis or the box is put down at the address, and
 * when the truck comes back for the loaded box. Nothing is asked under direct loading — the
 * truck's day is the booking's to fix. Each is a day and an hour on the quarter hour.
 */
export function DropMoments({
  idPrefix,
  box,
  set,
  modes,
}: {
  idPrefix: string;
  box: RouteBox;
  set: (box: RouteBox) => void;
  modes: readonly LoadingMode[];
}) {
  if (!isDropMode(modes, box.loadingMode)) return null;
  return (
    <>
      <Field
        id={`${idPrefix}-delivered`}
        label="Delivered on"
        hint="When the chassis or the box is put down at the address."
      >
        <MomentInput
          id={`${idPrefix}-delivered`}
          date={box.loadDate ?? null}
          time={box.loadTime ?? null}
          onChange={(loadDate, loadTime) => set({ ...box, loadDate, loadTime })}
        />
      </Field>
      <Field
        id={`${idPrefix}-pickBack`}
        label="Picked back on"
        hint="When the truck comes back for the loaded box."
      >
        <MomentInput
          id={`${idPrefix}-pickBack`}
          date={box.pickBackDate ?? null}
          time={box.pickBackTime ?? null}
          onChange={(pickBackDate, pickBackTime) => set({ ...box, pickBackDate, pickBackTime })}
        />
      </Field>
    </>
  );
}
