import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listIsLive } from "@/domain/pricing";
import type { listPriceLists } from "../queries";

type Row = Awaited<ReturnType<typeof listPriceLists>>[number];

/** On a contact: the agreements that price its quotations. */
export function ContactAgreements({ rows, today }: { rows: Row[]; today: string }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Agreed prices</h2>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">
            None — quotations use the catalogue.{" "}
            <Link className="underline" href="/settings/price-lists">
              Add an agreement
            </Link>
          </p>
        ) : (
          <ul className="grid gap-1">
            {rows.map(({ list: l }) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2">
                <Link
                  className="font-medium hover:underline"
                  href={`/settings/price-lists/${l.id}`}
                >
                  {l.name}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">
                  {l.validFrom ?? "…"} → {l.validUntil ?? "open"}
                </span>
                {listIsLive(l, today) && <ToneBadge tone="success">In force</ToneBadge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
