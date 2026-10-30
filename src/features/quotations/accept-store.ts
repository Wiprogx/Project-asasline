import "server-only";
import { inArray } from "drizzle-orm";
import type { Stop } from "@/domain/loading";
import { type RouteBox, type RouteStop, stopAddress } from "@/domain/route-service";
import { cityNameOf } from "@/server/city-sql";
import type { DbOrTx } from "@/server/db/client";
import { contacts } from "@/server/db/schema";

// Internal to accepting a destination: its loading, carried onto the booking and its boxes.

type Route = {
  boxes: number;
  loadingMode: string | null;
  loadAddressId: string | null;
  stops: RouteStop[];
  boxDetails: RouteBox[];
};

/** A place as the booking and the trucker copy write it: "Name, Kaai 1, 2000 Antwerpen, BE". */
async function addressesOf(tx: DbOrTx, ids: readonly string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await tx
    .select({
      id: contacts.id,
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: cityNameOf(contacts.cityId),
      country: contacts.country,
    })
    .from(contacts)
    .where(inArray(contacts.id, [...ids]));
  return new Map(
    rows.map((r) => [
      r.id,
      [
        r.name,
        stopAddress({
          street: r.street ?? "",
          zip: r.zip,
          city: r.city ?? "",
          country: r.country ?? "",
        }),
      ]
        .filter(Boolean)
        .join(", "),
    ]),
  );
}

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
    stops.map((s) => ({ address: at.get(s.contactId) ?? "", date: s.date, time: s.time }));
  return {
    booking: {
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
