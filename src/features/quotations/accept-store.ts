import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Stop } from "@/domain/loading";
import type { RouteBox, RouteStop } from "@/domain/route-service";
import { addressesOf } from "@/server/addresses";
import type { DbOrTx } from "@/server/db/client";
import { quotationLines, rateItems } from "@/server/db/schema";
import { lineDefaults } from "@/server/line-places";

// Internal to accepting a destination: its loading and its carriers, carried onto the booking.

/**
 * Who the destination was priced with (legacy: the lane's carrier on the booking): the shipping
 * line of the ocean leg it was built from, the trucker of its inland line, and — the line
 * known — its latest linked depot and terminal. The office may change any of them on the booking.
 */
export async function partiesOf(tx: DbOrTx, route: { id: string; laneId: string | null }) {
  const [lane] = route.laneId
    ? await tx
        .select({ carrierId: rateItems.carrierId })
        .from(rateItems)
        .where(eq(rateItems.id, route.laneId))
    : [];
  const [inland] = await tx
    .select({ carrierId: rateItems.carrierId })
    .from(quotationLines)
    .innerJoin(rateItems, eq(rateItems.id, quotationLines.itemId))
    .where(
      and(
        eq(quotationLines.routeId, route.id),
        isNull(quotationLines.archivedAt),
        eq(rateItems.category, "inland"),
      ),
    )
    .orderBy(asc(quotationLines.position))
    .limit(1);
  const shippingCoId = lane?.carrierId ?? null;
  return {
    shippingCoId,
    transporterId: inland?.carrierId ?? null,
    ...(await lineDefaults(tx, shippingCoId)),
  };
}

type Route = {
  boxes: number;
  loadingMode: string | null;
  loadAddressId: string | null;
  stops: RouteStop[];
  boxDetails: RouteBox[];
};

/**
 * What accepting a destination carries over (legacy doConvert): the booking's loading address
 * and mode, and each box's own — its loading as asked, and the HS rows it carries (quotation >
 * destination > container > HS).
 */
export async function loadingOf(tx: DbOrTx, route: Route) {
  const n = Math.max(1, route.boxes);
  const per: RouteBox[] = Array.from(
    { length: n },
    (_, i) =>
      route.boxDetails[i] ?? {
        loadingMode: route.loadingMode,
        loadAddressId: route.loadAddressId,
        stops: route.stops,
        hs: [],
      },
  );
  const ids = [
    route.loadAddressId,
    ...per.flatMap((b) => [b.loadAddressId, ...b.stops.map((s) => s.contactId)]),
  ].filter(Boolean) as string[];
  const at = await addressesOf(tx, ids);
  const asStops = (stops: readonly RouteStop[]): Stop[] =>
    stops.map((s) => ({
      placeId: s.contactId,
      address: at.get(s.contactId) ?? "",
      date: s.date,
      time: s.time,
    }));
  const loadAddressId = route.loadAddressId ?? per[0].loadAddressId ?? null;
  return {
    booking: {
      loadAddressId,
      loadAddress: route.loadAddressId
        ? (at.get(route.loadAddressId) ?? null)
        : per[0].loadAddressId
          ? (at.get(per[0].loadAddressId) ?? null)
          : null,
      loadingMode: route.loadingMode ?? per[0].loadingMode,
    },
    boxes: per.map((b) => ({
      loadingMode: b.loadingMode,
      loadAddress: b.loadAddressId ? (at.get(b.loadAddressId) ?? null) : null,
      stops: asStops(b.stops),
      hs: b.hs ?? [],
    })),
  };
}
