import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BOOKING_STATUS_META, type BookingStatus } from "@/domain/shipments";
import { VESSEL_STATUS_META, type VesselStatus } from "@/domain/vessels";

type Vessel = {
  name: string;
  imo: string | null;
  carrier: string | null;
  service: string | null;
  voyage: string;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  atd: string | null;
  ata: string | null;
  status: VesselStatus;
};
type OnBoard = { id: string; ref: string; status: BookingStatus; client: string | null };

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{v || "—"}</dd>
    </div>
  );
}

/** A planned day, and the actual one once known (legacy: actual in green beside the plan). */
function When({ planned, actual }: { planned: string | null; actual: string | null }) {
  return (
    <span className="font-mono text-xs">
      {planned ?? "—"}
      {actual && (
        <>
          {" · "}
          <span className="font-semibold text-primary">{actual} actual</span>
        </>
      )}
    </span>
  );
}

/**
 * Track a sailing (legacy trackVessel): the ship, its schedule planned and actual, and every
 * booking on it — for anyone who works the bookings, not only those who edit the register.
 */
export function VesselTrack({ vessel: v, bookings }: { vessel: Vessel; bookings: OnBoard[] }) {
  const meta = VESSEL_STATUS_META[v.status];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sailing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Kv k="IMO" v={v.imo} />
            <Kv k="Voyage" v={v.voyage} />
            <Kv k="Carrier" v={v.carrier} />
            <Kv k="Service" v={v.service} />
            <Kv k="Route" v={v.pol || v.pod ? `${v.pol ?? "?"} → ${v.pod ?? "?"}` : null} />
            <Kv k="Status" v={<ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>} />
            <Kv k="Departure" v={<When planned={v.etd} actual={v.atd} />} />
            <Kv k="Arrival" v={<When planned={v.eta} actual={v.ata} />} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Bookings on this sailing ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <ul className="grid gap-1.5 text-sm">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <Link className="font-mono hover:underline" href={`/bookings/${b.id}`}>
                      {b.ref}
                    </Link>{" "}
                    · {b.client ?? "—"}
                  </span>
                  <ToneBadge tone={BOOKING_STATUS_META[b.status].tone}>
                    {BOOKING_STATUS_META[b.status].label}
                  </ToneBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
