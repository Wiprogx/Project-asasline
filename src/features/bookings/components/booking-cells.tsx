import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { ALERT_META, type AlertLevel } from "@/domain/alerts";
import { type BookingColumnKey, closingLate } from "@/domain/booking-list";
import { BILL_STATUS_LABEL, BILL_STATUS_TONE } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import { SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import type { BookingRow } from "../list-queries";
import { BookingStatusBadge } from "./booking-status-badge";

const none = <span className="text-muted-foreground">—</span>;
const lines = (xs: readonly string[], mono = false) =>
  xs.length
    ? xs.map((x, i) => (
        <div key={i} className={mono ? "font-mono text-xs" : undefined}>
          {x}
        </div>
      ))
    : none;

/** The file's most serious open alert under its ref (legacy lastAlert). */
function AlertLine({ alert }: { alert: string | null }) {
  if (!alert) return null;
  const [level, ...rest] = alert.split("|");
  const meta = ALERT_META[level as AlertLevel] ?? ALERT_META.alert;
  return (
    <div className="mt-1 flex max-w-64 items-center gap-1.5 text-xs">
      <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
      <span className="truncate">{rest.join("|")}</span>
    </div>
  );
}

/** A closing, amber once passed while the box has not sailed (legacy cutCell). */
function Closing({ day, status, today }: { day: string | null; status: string; today: string }) {
  if (!day) return none;
  const late = closingLate(day, status, today);
  return (
    <span className={late ? "font-mono text-xs font-semibold text-warning" : "font-mono text-xs"}>
      {day}
      {late && <span className="sr-only"> (passed)</span>}
    </span>
  );
}

function Steps({ open, late }: { open: number; late: number }) {
  if (!open) return none;
  return (
    <ToneBadge tone={late ? "danger" : "success"}>
      {open}
      {late ? ` · ${late} late` : ""}
    </ToneBadge>
  );
}

/** Papers in out of papers needed; green once all are in (legacy docs column). */
function Docs({ got, need }: { got: number; need: number }) {
  if (!need) return none;
  return (
    <span className={got === need ? "font-medium text-primary tabular-nums" : "tabular-nums"}>
      {got}/{need}
      <span className="sr-only"> papers in</span>
    </span>
  );
}

type Cell = (b: BookingRow, today: string) => React.ReactNode;

/** Each column of the list: one real field of the booking (legacy B_COLS). */
export const CELLS: Record<BookingColumnKey, Cell> = {
  ref: (b) => (
    <>
      <Link href={`/bookings/${b.id}`} className="font-mono font-medium hover:underline">
        {b.ref}
      </Link>
      <AlertLine alert={b.alert} />
    </>
  ),
  kind: (b) => SHIPMENT_KIND_LABEL[b.kind].split(" — ")[0],
  status: (b) => <BookingStatusBadge status={b.status} />,
  client: (b) => <span className="line-clamp-2 max-w-48">{b.clientName}</span>,
  route: (b) => (b.pol || b.pod ? `${b.pol ?? "?"} → ${b.pod ?? "?"}` : none),
  load: (b) => lines(b.loads),
  loadDate: (b) =>
    b.loadDate ? (
      <span className="font-mono text-xs">
        {[b.loadDate, b.loadTime].filter(Boolean).join(" ")}
      </span>
    ) : (
      none
    ),
  mode: (b) => lines(b.modes),
  trucker: (b) => lines(b.truckers),
  carrier: (b) => b.carrierName ?? none,
  bookingNo: (b) =>
    b.carrierBookingNo ? <span className="font-mono text-xs">{b.carrierBookingNo}</span> : none,
  blNo: (b) => (b.blNo ? <span className="font-mono text-xs">{b.blNo}</span> : none),
  boxes: (b) =>
    lines(
      b.boxNos.map((n, i) => n || `Box ${i + 1} · n° to follow`),
      true,
    ),
  vessel: (b) => (b.vesselName ? [b.vesselName, b.voyage].filter(Boolean).join(" · ") : none),
  portCutOff: (b, t) => <Closing day={b.portCutOff} status={b.status} today={t} />,
  vgmClosing: (b, t) => <Closing day={b.vgmClosing} status={b.status} today={t} />,
  customsClosing: (b, t) => <Closing day={b.customsClosing} status={b.status} today={t} />,
  siClosing: (b, t) => <Closing day={b.siClosing} status={b.status} today={t} />,
  etd: (b) => (b.etd ? <span className="font-mono text-xs">{b.etd}</span> : none),
  eta: (b) => (b.eta ? <span className="font-mono text-xs">{b.eta}</span> : none),
  steps: (b) => <Steps open={b.openSteps} late={b.lateSteps} />,
  docs: (b) => <Docs got={b.docsIn} need={b.docsNeeded} />,
  value: (b) =>
    b.valueCents ? <span className="tabular-nums">{formatCents(b.valueCents)}</span> : none,
  billing: (b) =>
    b.billing !== "none" ? (
      <ToneBadge tone={BILL_STATUS_TONE[b.billing]}>{BILL_STATUS_LABEL[b.billing]}</ToneBadge>
    ) : null,
};
