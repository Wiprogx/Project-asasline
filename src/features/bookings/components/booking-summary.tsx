import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { containerNumberOk } from "@/domain/container";
import { SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import type { getBooking } from "../queries";

type Booking = NonNullable<Awaited<ReturnType<typeof getBooking>>>;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{v || "—"}</dd>
    </div>
  );
}

export function BookingSummary({ b }: { b: Booking }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Shipment</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Row
              k="Customer"
              v={
                <Link className="hover:underline" href={`/contacts/${b.client.id}`}>
                  {b.client.name}
                </Link>
              }
            />
            <Row k="Direction" v={SHIPMENT_KIND_LABEL[b.kind]} />
            <Row k="Route" v={b.pol || b.pod ? `${b.pol ?? "?"} → ${b.pod ?? "?"}` : null} />
            <Row
              k="Loading"
              v={[b.loadDate, b.loadTime, b.loadAddress].filter(Boolean).join(" · ")}
            />
            <Row k="Commodity" v={b.commodity} />
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
          <CardTitle>Containers ({b.containers.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {b.containers.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">
                #{i + 1} · {c.type}
              </span>
              <span className="font-mono">
                {c.number ?? "number not yet known"}
                {c.number && !containerNumberOk(c.number) && (
                  <span className="ml-2 text-destructive">check digit ✗</span>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
