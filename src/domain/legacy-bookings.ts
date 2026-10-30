/**
 * A legacy booking (legacy mkB, readConts) as the new booking and its boxes. The SB reference
 * is kept as issued (invariant 2); each party comes as a contact through `party` (its legacy
 * id first, else its name — the legacy 10.1 linking). Dates become days; times stay HH:MM.
 */
import type { AlertLevel } from "./alerts";
import type { HsLine } from "./goods";
import { boxType } from "./legacy-config";
import type { Stop } from "./loading";
import { BOOKING_STATUSES, type BookingStatus, type ShipmentKind } from "./shipments";

/** Legacy party field → the booking's column (domain/booking-parties). */
export const LEGACY_PARTIES = {
  client: "clientId",
  payeur: "payerId",
  shipper: "shipperId",
  consignee: "consigneeId",
  notify: "notifyId",
  docCheck: "docCheckId",
  shippingCo: "shippingCoId",
  transporter: "transporterId",
  forworder: "forwarderId",
  customs: "customsAgentId",
  releaseBy: "releaseById",
  docReceiver: "docReceiverId",
} as const;
type PartyColumn = (typeof LEGACY_PARTIES)[keyof typeof LEGACY_PARTIES];

/** Finds a contact by a legacy id or a name; null when the office never had it. */
export type PartyLookup = (legacyId: unknown, name: unknown) => string | null;

const KIND: Record<string, ShipmentKind> = { Export: "export", Import: "import", Both: "both" };
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v: unknown) => {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
/** "2026-09-30 14:00" → ["2026-09-30", "14:00"]. */
const split = (v: unknown): [string | null, string | null] => {
  const s = typeof v === "string" ? v : "";
  const t = /\b([01]\d|2[0-3]):[0-5]\d\b/.exec(s.slice(10));
  return [day(s), t ? t[0] : null];
};
const kg = (v: unknown) => (Number(v) > 0 ? Math.round(Number(v)) : null);
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];

const stopsOf = (v: unknown): Stop[] =>
  objects(v)
    .filter((s) => text(s.addr))
    .map((s) => ({ address: text(s.addr)!, date: day(s.date), time: text(s.time) }));

const hsOf = (v: unknown): HsLine[] =>
  objects(v)
    .filter((h) => text(h.code))
    .map((h) => ({
      code: text(h.code)!,
      weightKg: kg(h.weight),
      packages: kg(h.pkgQty),
      packageType: text(h.pkgType),
    }));

function boxOf(
  c: Record<string, unknown>,
  i: number,
  b: Record<string, unknown>,
  party: PartyLookup,
) {
  const [pickBackDate, pickBackTime] = split(c.pickBackAt);
  const seals = objects(c.seals)
    .map((s) => text(s.no))
    .concat((Array.isArray(c.seals) ? c.seals : []).filter((s) => typeof s === "string"))
    .filter((s): s is string => !!s);
  return {
    position: i,
    number: text(c.no)?.toUpperCase().replace(/[\s-]/g, "") ?? null,
    type: boxType(String(text(c.type) ?? text(b.containerType) ?? "40HC")),
    seals,
    tareKg: kg(c.tare),
    cargoKg: kg(c.weight),
    loadAddress: text(c.loadAddr),
    loadDate: day(c.loadDate),
    loadTime: text(c.loadTime),
    loadingMode: text(c.loadingMode),
    transporterId: text(c.transporter) ? party(c.transporterId, c.transporter) : null,
    pickBackDate,
    pickBackTime,
    stops: stopsOf(c.stops),
    hsLines: hsOf(c.hs),
    packages: kg(c.pkgQty),
    /** Resolved with the HS lines and seals by the importer (server/container-goods). */
    packageType: text(c.pkgType),
    blDescription: text(c.blDesc),
  };
}

const LEVEL: Record<string, AlertLevel> = {
  red: "urgent",
  urgent: "urgent",
  amber: "alert",
  alert: "alert",
};

export function mapLegacyBooking(b: Record<string, unknown>, party: PartyLookup) {
  const ref = text(b.ref);
  if (!ref) return null;
  const warnings: string[] = [];
  const parties = {} as Record<PartyColumn, string | null>;
  for (const [field, column] of Object.entries(LEGACY_PARTIES)) {
    const name = text(b[field]);
    const id = name || b[`${field}Id`] ? party(b[`${field}Id`], name) : null;
    if (name && !id) warnings.push(`${field} "${name}" is not a contact — left empty`);
    parties[column] = id;
  }
  const status: BookingStatus = (BOOKING_STATUSES as readonly string[]).includes(String(b.status))
    ? (b.status as BookingStatus)
    : "confirmed";
  const cancel = (b.cancel ?? {}) as Record<string, unknown>;
  const boxes = objects(b.containers).length
    ? objects(b.containers)
    : [{ no: b.containerNo, seals: [], hs: [] }];
  const files = objects(b.docs).length;
  if (status === "cancelled" && text(cancel.note))
    warnings.push(`its cancel note is not carried: "${text(cancel.note)}"`);
  if (files) warnings.push(`${files} file(s) on the booking are not carried by this step`);
  return {
    booking: {
      ref,
      status,
      kind: KIND[String(b.kind)] ?? "export",
      ...parties,
      pickupDepot: text(b.pickupContainer),
      pickupDate: day(b.pickupDate),
      terminal: text(b.terminalContainer),
      loadAddress: text(b.loadAddr),
      loadDate: day(b.loadDate),
      loadTime: text(b.loadTime),
      loadingMode: text(b.loadingMode),
      carrierBookingNo: text(b.bookingNo),
      blNo: text(b.blNo),
      /** Resolved to a Settings › Lists › Document types row by the importer. */
      docTypeLabel: text(b.docType) ?? "SEA WAYBILL",
      vesselName: text(b.vessel),
      voyage: text(b.voyage),
      etd: day(b.etd),
      eta: day(b.eta),
      customsClosing: day(b.customsClosing),
      vgmClosing: day(b.vgmClosing),
      siClosing: day(b.siDocClosing),
      portCutOff: day(b.portCutOff),
      commodity: text(b.commodity),
      release: text(b.release) ?? "pending",
      releaseNote: text(b.releaseNote),
      originalsPickup: text(b.blPickAddr),
      originalsRequestedOn: day(b.sendRequestedAt),
      sendMode: text(b.sendMode),
      sendTracking: text(b.sendTracking),
      /** Resolved to a Settings › Cancel reasons row by the importer (scripts/import/config). */
      cancelReasonLabel: status === "cancelled" ? (text(cancel.reason) ?? "Other") : null,
      statusBeforeCancel:
        status === "cancelled" &&
        (BOOKING_STATUSES as readonly string[]).includes(String(b.statusBefore))
          ? (b.statusBefore as BookingStatus)
          : null,
    },
    containers: boxes.map((c, i) => boxOf(c, i, b, party)),
    alerts: objects(b.alerts)
      .filter((a) => text(a.text))
      .map((a) => ({
        level: LEVEL[String(a.sev)] ?? ("info" as AlertLevel),
        text: text(a.text)!,
        resolved: !!a.resolved,
      })),
    warnings,
  };
}
