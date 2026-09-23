import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { containerNumberOk } from "@/domain/container";
import { SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import type { getBooking } from "../queries";
import { VgmBadge } from "./vgm-badge";

type Booking = NonNullable<Awaited<ReturnType<typeof getBooking>>>;
type Party = { id: string; name: string } | null;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{v || "—"}</dd>
    </div>
  );
}

const party = (p: Party) =>
  p && (
    <Link className="hover:underline" href={`/contacts/${p.id}`}>
      {p.name}
    </Link>
  );

export function BookingSummary({ b }: { b: Booking }) {
  const route = b.pol || b.pod ? `${b.pol ?? "?"} → ${b.pod ?? "?"}` : null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Shipment</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Row k="Customer" v={party(b.client)} />
            <Row k="Direction" v={SHIPMENT_KIND_LABEL[b.kind]} />
            <Row k="Route" v={route} />
            <Row
              k="Loading"
              v={[b.loadDate, b.loadTime, b.loadAddress].filter(Boolean).join(" · ")}
            />
            <Row k="Commodity" v={b.commodity} />
            <Row k="Document" v={b.docType} />
            <Row
              k="Quotation"
              v={
                b.quotation && (
                  <Link
                    className="font-mono hover:underline"
                    href={`/quotations/${b.quotation.id}`}
                  >
                    {b.quotation.ref}
                  </Link>
                )
              }
            />
            {b.cancelReason && <Row k="Cancelled because" v={b.cancelReason} />}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Parties & sailing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Row k="Payer" v={party(b.payer)} />
            <Row k="Shipper" v={party(b.shipper)} />
            <Row k="Consignee" v={party(b.consignee)} />
            <Row k="Notify" v={party(b.notify)} />
            <Row k="Vessel / voyage" v={[b.vesselName, b.voyage].filter(Boolean).join(" · ")} />
            <Row k="ETD → ETA" v={b.etd || b.eta ? `${b.etd ?? "?"} → ${b.eta ?? "?"}` : null} />
            <Row
              k="Closings"
              v={[
                b.customsClosing && `customs ${b.customsClosing}`,
                b.vgmClosing && `VGM ${b.vgmClosing}`,
                b.siClosing && `SI ${b.siClosing}`,
                b.portCutOff && `port ${b.portCutOff}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row k="Carrier booking" v={b.carrierBookingNo} />
            <Row k="B/L" v={b.blNo} />
          </dl>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Containers ({b.containers.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {b.containers.map((c, i) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">
                #{i + 1} · {c.type}
                {c.seals.length > 0 && ` · seals ${c.seals.join(", ")}`}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono">
                  {c.number ?? "number not yet known"}
                  {c.number && !containerNumberOk(c.number) && (
                    <span className="ml-2 text-destructive">check digit ✗</span>
                  )}
                </span>
                <VgmBadge type={c.type} cargoKg={c.cargoKg} tareKg={c.tareKg} />
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
