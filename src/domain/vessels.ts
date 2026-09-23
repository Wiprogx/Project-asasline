/**
 * The vessel register (legacy VESSELS / CUTOFF_RULES / cutoffsFor). A sailing is kept once;
 * the bookings on it take their ETD, ETA and closing dates from it, so when the carrier moves
 * the ship every booking on it moves — and the document steps anchored on those dates with it.
 */
import { addDays } from "./dates";

export const VESSEL_STATUSES = ["scheduled", "sailed", "arrived", "delayed", "omitted"] as const;
export type VesselStatus = (typeof VESSEL_STATUSES)[number];

export const VESSEL_STATUS_META: Record<
  VesselStatus,
  { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }
> = {
  scheduled: { label: "Scheduled", tone: "neutral" },
  sailed: { label: "Sailed", tone: "info" },
  arrived: { label: "Arrived", tone: "success" },
  delayed: { label: "Delayed", tone: "warning" },
  omitted: { label: "Port omitted", tone: "danger" },
};

/** The closings on a booking, each so many days before the ETD (legacy CUTOFF_RULES). */
export const CUTOFF_KEYS = ["customsClosing", "siClosing", "vgmClosing", "portCutOff"] as const;
export type CutoffKey = (typeof CUTOFF_KEYS)[number];

export const CUTOFF_LABEL: Record<CutoffKey, string> = {
  customsClosing: "Customs closing",
  siClosing: "SI & doc closing",
  vgmClosing: "VGM closing",
  portCutOff: "Port cut-off",
};

export type CutoffRules = Record<CutoffKey, number>;

export const DEFAULT_CUTOFFS: CutoffRules = {
  customsClosing: 3,
  siClosing: 2,
  vgmClosing: 2,
  portCutOff: 1,
};

export function cutoffsFor(etd: string, rules: CutoffRules): Record<CutoffKey, string> {
  return Object.fromEntries(CUTOFF_KEYS.map((k) => [k, addDays(etd, -rules[k])])) as Record<
    CutoffKey,
    string
  >;
}

export type Sailing = {
  name: string;
  voyage: string;
  etd: string | null;
  eta: string | null;
};

/** What a booking takes from its sailing: the ship, the voyage, the dates and the closings. */
export function bookingFieldsOf(v: Sailing, rules: CutoffRules) {
  return {
    vesselName: v.name,
    voyage: v.voyage,
    etd: v.etd,
    eta: v.eta,
    ...(v.etd
      ? cutoffsFor(v.etd, rules)
      : { customsClosing: null, siClosing: null, vgmClosing: null, portCutOff: null }),
  };
}

/** A sailing's line in a picker: "MSC ROMA · FA534A — BEANR › CMDLA · ETD 2026-08-28". */
export const sailingLabel = (v: Sailing & { pol: string | null; pod: string | null }) =>
  `${v.name} · ${v.voyage} — ${v.pol ?? "?"} › ${v.pod ?? "?"}${v.etd ? ` · ETD ${v.etd}` : ""}`;

export function sailingProblem(v: { etd: string | null; eta: string | null }): string | null {
  return v.etd && v.eta && v.eta < v.etd ? "The ETA is before the ETD." : null;
}
