import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { linksReport } from "../queries";

type Report = Awaited<ReturnType<typeof linksReport>>;

function Count({ n, bad }: { n: number; bad: "danger" | "warning" }) {
  return <ToneBadge tone={n ? bad : "success"}>{n || "none"}</ToneBadge>;
}

/** What is still text, or missing, where a link should be (legacy vLinksCard). */
export function LinksReport({ r }: { r: Report }) {
  const unlinked = r.carriers.filter((c) => !c.linked);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            Shipping lines and their office here <Count n={unlinked.length} bad="warning" />
          </CardTitle>
          <CardDescription>
            MSC is the line on the sailing; MSC Belgium is who we call and who invoices us. A line
            named on a sailing or a catalogue leg with no contact of that name has no office here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {r.carriers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipping line named yet.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {r.carriers.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span>{c.name}</span>
                  {c.linked ? (
                    <ToneBadge tone="success">contact</ToneBadge>
                  ) : (
                    <Link className="text-xs underline" href="/contacts/new">
                      add the contact
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            Bookings with no quotation behind them <Count n={r.unpriced.length} bad="warning" />
          </CardTitle>
          <CardDescription>
            A booking reads its price from its quotation; without one there is nothing to invoice
            from and nothing to accrue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {r.unpriced.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every live booking has its quotation.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {r.unpriced.map((b) => (
                <li key={b.id}>
                  <Link className="font-mono hover:underline" href={`/bookings/${b.id}`}>
                    {b.ref}
                  </Link>{" "}
                  · {b.client}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            Customers shipping without a VAT number <Count n={r.noVat.length} bad="danger" />
          </CardTitle>
          <CardDescription>
            An invoice and a Peppol file need it; a customer outside the EU still needs its
            identifier for the export declaration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {r.noVat.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every customer with a live booking has one.
            </p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {r.noVat.map((c) => (
                <li key={c.id}>
                  <Link className="hover:underline" href={`/contacts/${c.id}`}>
                    {c.name}
                  </Link>
                  {c.country && <span className="text-muted-foreground"> · {c.country}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
