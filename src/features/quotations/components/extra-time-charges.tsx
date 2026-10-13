import { extraTimeItem, type LoadingCheck } from "@/domain/loading-check";
import { RaiseChargeForm } from "./raise-charge-form";

type Item = { id: string; label: string; sellCents: number; buyCents: number };

/**
 * One "Charge the extra time" form per box that ran over (legacy chargeExtraTime): waiting
 * time for a direct loading, detention or storage for a dropped box, the hours or days filled.
 */
export function ExtraTimeCharges({
  checks,
  file,
  items,
  canSeeCost,
}: {
  checks: (LoadingCheck | null)[];
  file: {
    quotation: { id: string; ref: string; version: number };
    routeId: string;
    bookingId: string;
  };
  items: Item[];
  canSeeCost: boolean;
}) {
  return checks.map((ck, i) =>
    ck?.state === "measured" && ck.chargeQty > 0 ? (
      <RaiseChargeForm
        key={i}
        title={`Charge the extra time — box ${i + 1}`}
        preset={{
          itemId: extraTimeItem(items, ck.drop)?.id ?? null,
          qty: ck.chargeQty,
          reason: `${ck.message} (box ${i + 1})`,
        }}
        {...file}
        boxes={checks.length}
        items={items}
        canSeeCost={canSeeCost}
      />
    ) : null,
  );
}
