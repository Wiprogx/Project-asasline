"use client";

import { Field } from "@/components/shared/field";
import { MomentInput } from "@/components/shared/moment-input";
import { isDropMode, type LoadingMode } from "@/domain/loading";
import type { RouteBox } from "@/domain/route-service";

/**
 * When a box is loaded, agreed at quotation stage as the booking's loading card asks it
 * (bookings box-loading-fields): under direct loading, the day and hour the truck loads;
 * under a drop mode (chassis disconnected, box on the ground), when the chassis or the box is
 * put down at the address and when the truck comes back for the loaded box. Each is a day and
 * an hour on the quarter hour; a quotation may leave them open.
 */
export function LoadingMoments({
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
  const drop = isDropMode(modes, box.loadingMode);
  const id = `${idPrefix}-${drop ? "delivered" : "loading"}`;
  return (
    <>
      <Field
        id={id}
        label={drop ? "Delivered on" : "Loading on"}
        hint={
          drop
            ? "When the chassis or the box is put down at the address."
            : "The day and hour the truck loads, as agreed with the customer."
        }
      >
        <MomentInput
          id={id}
          date={box.loadDate ?? null}
          time={box.loadTime ?? null}
          onChange={(loadDate, loadTime) => set({ ...box, loadDate, loadTime })}
        />
      </Field>
      {drop && (
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
      )}
    </>
  );
}
