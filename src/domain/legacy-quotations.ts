/**
 * A legacy quotation (legacy mkQ / newQ / fillRouteLines) as the new quotation, its
 * destinations and their lines. The QT reference is kept as issued (invariant 2); every line
 * names a catalogue item, found through the rate catalogue's import links.
 */
import type { PriceSource } from "./pricing";
import type { QuotationStatus, ShipmentKind } from "./shipments";

/** A catalogue item as the import found it: its new id and how its line reads. */
export type ImportedItem = {
  id: string;
  category: string;
  label: string;
  vatCode: string;
  pol: string | null;
  pod: string | null;
  containerType: string | null;
};

const STATUS: Record<string, QuotationStatus> = {
  draft: "draft",
  sent: "sent",
  followup: "sent",
  won: "accepted",
  lost: "declined",
  cancelled: "cancelled",
};
const KIND: Record<string, ShipmentKind> = { Export: "export", Import: "import", Both: "both" };
const SOURCE: Record<string, PriceSource> = {
  agreement: "agreement",
  last: "last",
  catalogue: "catalogue",
  auto: "catalogue",
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) : 0);
const day = (v: unknown) => {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];

export const statusOf = (s: unknown): QuotationStatus => STATUS[String(s)] ?? "draft";

function lineOf(
  l: Record<string, unknown>,
  item: ImportedItem | undefined,
  position: number,
  warnings: string[],
) {
  if (!item)
    warnings.push(`a line names catalogue item ${String(l.itemId)}, not found — kept as typed`);
  return {
    position,
    itemId: item?.id ?? null,
    description: item?.label ?? text(l.desc) ?? `Item ${String(l.itemId ?? "?")}`,
    qty: 1,
    // A line with no box applies to every box (legacy); one naming a box counts once.
    perBox: l.box === null || l.box === undefined || l.box === 0,
    condition: item?.category === "freetime",
    sellCents: cents(l.sell),
    costCents: cents(l.cost ?? l.buy),
    vatCode: item?.vatCode ?? "EX41",
    priceSource: SOURCE[String(l.src)] ?? "manual",
  };
}

export function mapLegacyQuotation(
  q: Record<string, unknown>,
  items: (legacyId: string) => ImportedItem | undefined,
) {
  const ref = text(q.ref);
  if (!ref) return null;
  const warnings: string[] = [];
  // Older quotations carry one destination on the quotation itself.
  const routes = objects(q.routes).length
    ? objects(q.routes)
    : [{ laneId: q.laneId, lines: q.lines, qty: 1 }];
  const cancel = (q.cancel ?? {}) as Record<string, unknown>;
  const status = statusOf(q.status);
  return {
    quotation: {
      ref,
      status,
      kind: KIND[String(q.kind)] ?? "export",
      validUntil: day(q.validUntil),
      paymentTermId: text(q.termId),
      note: text(q.note),
      display: q.display === "inclusive" ? ("inclusive" as const) : ("itemized" as const),
      sentOn: day(q.sentAt),
      sentVia: text(q.sentVia),
      commodity: text(q.commodity),
      docType: text(q.docType),
      declinedReason: status === "declined" ? text(q.lostReason) : null,
      cancelReason:
        status === "cancelled"
          ? [text(cancel.reason), text(cancel.note)].filter(Boolean).join(" — ") || "Cancelled"
          : null,
      statusBeforeCancel:
        status === "cancelled" && q.statusBefore ? statusOf(q.statusBefore) : null,
    },
    routes: routes.map((r, i) => {
      const lane = items(String(r.laneId ?? ""));
      if (!lane)
        warnings.push(`destination ${i + 1}: its ocean leg ${String(r.laneId)} was not found`);
      return {
        route: {
          position: i,
          pol: lane?.pol ?? "?",
          pod: lane?.pod ?? "?",
          containerType: lane?.containerType ?? null,
          declined: !!r.declined,
          declinedReason: r.declined ? text(r.declineReason) : null,
          loadingMode: text(r.loadingMode),
          boxes: Math.max(1, Math.round(Number(r.qty) || 1)),
        },
        lines: objects(r.lines).map((l, k) =>
          lineOf(l, items(String(l.itemId ?? "")), k, warnings),
        ),
      };
    }),
    warnings,
  };
}
