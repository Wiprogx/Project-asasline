import { addDays } from "../dates";
import type { Role } from "../permissions";
import type { ShipmentKind } from "../shipments";
import { closedDays, type Holiday, pullToWorkday, shiftWorkdays } from "./calendar";

/**
 * The document rules engine (legacy DOC_RULES): one engine for every destination. The
 * destination decides WHICH papers; the loading port decides order and timing. Adding a
 * country is a row in Settings, not code (invariant 5).
 */
export const ANCHORS = ["loading", "customs", "vgm", "si", "portcut", "etd", "eta"] as const;
export type Anchor = (typeof ANCHORS)[number];

export const ANCHOR_LABEL: Record<Anchor, string> = {
  loading: "Loading date",
  customs: "Customs closing",
  vgm: "VGM closing",
  si: "SI & doc closing",
  portcut: "Port cut-off",
  etd: "Departure (ETD)",
  eta: "Arrival (ETA)",
};

/** Who owes the paper — shown on the step; the office role below is who chases it. */
export const PARTIES = [
  "customer",
  "payer",
  "consignee",
  "customs",
  "carrier",
  "waiver",
  "internal",
] as const;
export type Party = (typeof PARTIES)[number];

export type DocRule = {
  code: string;
  doc: string;
  step: string;
  country: string; // ISO-2 destination, or "*"
  pol: string; // UN/LOCODE of the loading port, or "*"
  kind: "export" | "import" | "*";
  party: Party;
  role: Role;
  anchor: Anchor;
  offset: number;
  workingDays: boolean;
  blocking: boolean;
  needs: string[];
  active: boolean;
  note?: string;
  /**
   * "What we didn't sell is not our job" (invariant 6): when set, the rule applies only if a
   * line of the booking's quotation matches it (words, or a pattern such as "vgm|certiweight").
   */
  sold?: string;
  /** One step per container (legacy perBox): the Certiweight certificate of each box. */
  perBox?: boolean;
  /** The step opens only once every box's cargo weight is in (legacy VGM weightsReady). */
  ready?: "weights";
};

export type BookingFacts = {
  ref: string;
  kind: ShipmentKind;
  pol: string | null;
  pod: string | null;
  docType: string;
  anchors: Partial<Record<Anchor, string | null>>;
  /** The quotation's line descriptions; null when no quotation is behind the booking. */
  soldLines?: readonly string[] | null;
  /** The live boxes, for per-box rules and the weights check; their label is the number or "box n". */
  boxes?: readonly { id: string; label: string; weightsIn: boolean }[];
};

/** Whether the quotation sold what a rule needs. No quotation behind it: assume it is ours. */
export function soldOnQuote(
  pattern: string | undefined,
  soldLines: readonly string[] | null | undefined,
) {
  if (!pattern?.trim() || !soldLines) return true;
  let re: RegExp;
  try {
    re = new RegExp(pattern, "i");
  } catch {
    // Not a valid pattern: read it as plain words.
    re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  return soldLines.some((l) => re.test(l));
}

/** UN/LOCODE "TRMER" → "TR". A port that is not a LOCODE gives no country (fail closed). */
export const countryOfPort = (port: string | null) =>
  port && /^[A-Z]{2}[A-Z2-9]{3}$/.test(port.toUpperCase()) ? port.slice(0, 2).toUpperCase() : null;

/** A return ("both") carries the export papers out and the import papers back. */
const sides = (kind: ShipmentKind) => (kind === "both" ? ["export", "import"] : [kind]);

/** The rules that apply; for one code, a rule for this loading port beats the general one. */
export function applicableRules(rules: readonly DocRule[], b: BookingFacts): DocRule[] {
  const country = countryOfPort(b.pod);
  const pol = (b.pol ?? "").toUpperCase();
  const out = new Map<string, DocRule>();
  for (const r of rules) {
    if (!r.active) continue;
    if (r.country !== "*" && r.country !== country) continue;
    if (r.pol !== "*" && r.pol.toUpperCase() !== pol) continue;
    if (r.kind !== "*" && !sides(b.kind).includes(r.kind)) continue;
    if (!soldOnQuote(r.sold, b.soldLines)) continue;
    const seen = out.get(r.code);
    if (!seen || (seen.pol === "*" && r.pol !== "*")) out.set(r.code, r);
  }
  return [...out.values()];
}

/** "{docName}" in a step reads as the document the customer chose (Sea Waybill, Original BL…). */
export function fillStep(text: string, b: Pick<BookingFacts, "docType" | "ref">): string {
  const docName = b.docType
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bBl\b/, "BL");
  return text.replace(/\{docName\}/g, docName).replace(/\{ref\}/g, b.ref);
}

export type Due = { day: string; movedBecause: string | null } | null;

/**
 * The due day of a rule on a booking. No anchor date yet → no due date yet (the step still
 * opens: the invoice must be asked for before the ship is booked). Working-day offsets skip
 * closed days; a calendar-day deadline that lands on one is pulled back to an open day.
 */
export function dueOf(rule: DocRule, b: BookingFacts, holidays: readonly Holiday[]): Due {
  const base = b.anchors[rule.anchor];
  if (!base) return null;
  const country = countryOfPort(b.pod);
  const closed = closedDays(holidays, country ? ["BE", country] : ["BE"]);
  if (rule.workingDays) {
    const day = shiftWorkdays(base, rule.offset, closed);
    return day ? { day, movedBecause: null } : null;
  }
  const day = addDays(base, rule.offset);
  return day ? pullToWorkday(day, closed) : null;
}

/**
 * The prerequisites still missing. Fail closed: a code that exists nowhere in the rule book
 * is a typo or a renamed rule, and blocks rather than waving the shipment past. A code that
 * exists but does not apply to this route (another country's paper) blocks nothing.
 */
export function missingPrerequisites(
  rule: DocRule,
  live: readonly DocRule[],
  book: readonly DocRule[],
  settled: ReadonlySet<string>,
): string[] {
  return rule.needs.filter((code) => {
    if (live.some((r) => r.code === code)) return !settled.has(code);
    return !book.some((r) => r.code === code);
  });
}
