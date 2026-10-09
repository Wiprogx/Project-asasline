import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BOOKING_STATUS_META,
  BOOKING_STATUSES,
  QUOTATION_STATUSES,
  type QuotationStatus,
  type Tone,
} from "@/domain/shipments";
import type { statusCounts } from "../status-queries";

type Counts = Awaited<ReturnType<typeof statusCounts>>;

const QUOTATION_META: Record<QuotationStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

function Rows({ rows }: { rows: { label: string; tone: Tone; n: number }[] }) {
  return (
    <ul className="divide-y text-sm">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center justify-between gap-2 py-1.5">
          <ToneBadge tone={r.tone}>{r.label}</ToneBadge>
          <span className="text-muted-foreground tabular-nums">
            {r.n} {r.n === 1 ? "record" : "records"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The statuses (legacy Settings › Quotation statuses, Booking statuses): fixed, as they drive
 * the system — shown with how many records sit in each, and the next numbers of the month.
 */
export function StatusesCard({ counts }: { counts: Counts }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Quotation statuses</CardTitle>
          <CardDescription>
            Fixed, as they drive the logic: Draft → Sent → Accepted (which opens the SB booking) or
            Declined; Cancelled keeps its QT number without a booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Rows
            rows={QUOTATION_STATUSES.map((s) => ({
              ...QUOTATION_META[s],
              n: counts.quotations.get(s) ?? 0,
            }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Booking statuses</CardTitle>
          <CardDescription>
            Numbering: SB and QT, the year and month, then three digits; the counter starts again
            every month and is issued by the database when the record is created.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Rows
            rows={BOOKING_STATUSES.map((s) => ({
              ...BOOKING_STATUS_META[s],
              n: counts.bookings.get(s) ?? 0,
            }))}
          />
          <p className="text-sm">
            Next numbers:{" "}
            {counts.next.map((n, i) => (
              <span key={n.prefix}>
                {i > 0 && " · "}
                <span className="font-mono">{n.ref}</span>
              </span>
            ))}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
