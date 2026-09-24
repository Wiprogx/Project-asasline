import { addressLabel, boxesFor, boxRows, boxTitle, cutOffRows } from "@/domain/booking-doc";
import { vgm } from "@/domain/container";
import { SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import type { bookingCopy } from "../copy-queries";
import { RowGrid, SheetTitle } from "./copy-parts";

type Copy = NonNullable<Awaited<ReturnType<typeof bookingCopy>>>;

const kg = (n: number) => `${n.toLocaleString("en")} kg`;

/**
 * The trucker copy (legacy preview "driver"): no price; one box per driver unless the office
 * asks for all, so a loading address and hour cannot be confused between drivers.
 */
export function TruckerCopy({
  copy: { booking: b, client },
  box,
}: {
  copy: Copy;
  box: number | null;
}) {
  const boxes = boxesFor(b.containers, box);
  return (
    <section className="grid gap-5 text-sm">
      <div className="text-right text-xs font-bold uppercase">{SHIPMENT_KIND_LABEL[b.kind]}</div>
      <SheetTitle>Loading order — no price</SheetTitle>
      <RowGrid
        cols={2}
        rows={[
          [
            "Customer",
            [client?.name, client?.phone, client?.email].filter(Boolean).join("\n") || "—",
          ],
          ["Booking", b.ref],
        ]}
      />
      <RowGrid
        rows={[
          ["Shipping line booking", b.carrierBookingNo ?? "—"],
          ["Vessel · voyage", [b.vesselName, b.voyage].filter(Boolean).join(" · ") || "—"],
          ["Route", `${b.pol ?? "—"} › ${b.pod ?? "—"}`],
          ["ETD", b.etd ?? "—"],
        ]}
      />
      {boxes.length === 0 && <p>No such container on this booking.</p>}
      {boxes.map(({ box: c, i }) => {
        const g = vgm(c);
        return (
          <div key={i} className="grid gap-2 rounded border border-neutral-800 p-3">
            <div className="font-semibold">{boxTitle(c, i, b.containers.length)}</div>
            <RowGrid
              rows={[
                [addressLabel(b.kind), b.loadAddress ?? "—"],
                ["Loading date", [b.loadDate, b.loadTime].filter(Boolean).join(" ") || "—"],
                ...boxRows(b, c),
                [
                  "VGM",
                  g.state === "unknown"
                    ? `— (${g.reason})`
                    : g.state === "over" && g.maxGrossKg !== null
                      ? `${kg(g.grossKg)} — ${kg(g.grossKg - g.maxGrossKg)} OVER the ${kg(g.maxGrossKg)} limit`
                      : kg(g.grossKg),
                ],
              ]}
            />
          </div>
        );
      })}
      <SheetTitle>Cut-offs</SheetTitle>
      <RowGrid rows={cutOffRows(b)} />
    </section>
  );
}
