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

/** One closing's rule: so many days before the ETD, at this hour of the day (none: the day alone). */
export type CutoffRule = { days: number; time: string | null };
export type CutoffRules = Record<CutoffKey, CutoffRule>;

/** The legacy offsets and hours (CUTOFF_RULES): customs and SI at noon, VGM at 16:00, the port at 22:00. */
export const DEFAULT_CUTOFFS: CutoffRules = {
  customsClosing: { days: 3, time: "12:00" },
  siClosing: { days: 2, time: "12:00" },
  vgmClosing: { days: 2, time: "16:00" },
  portCutOff: { days: 1, time: "22:00" },
};

/** The hour column beside a closing's day: `customsClosing` → `customsClosingTime`. */
export const cutoffTimeKey = (k: CutoffKey) => `${k}Time` as const;
export type CutoffTimeKey = ReturnType<typeof cutoffTimeKey>;

/** Every closing's day and hour from an ETD (legacy cutoffsFor): the day so many before, the rule's hour. */
export function cutoffsFor(
  etd: string,
  rules: CutoffRules,
): Record<CutoffKey | CutoffTimeKey, string | null> {
  return Object.fromEntries(
    CUTOFF_KEYS.flatMap((k) => [
      [k, addDays(etd, -rules[k].days)],
      [cutoffTimeKey(k), rules[k].time],
    ]),
  ) as Record<CutoffKey | CutoffTimeKey, string | null>;
}

export type Sailing = {
  name: string;
  voyage: string;
  etd: string | null;
  eta: string | null;
  /** The hours beside the dates, when the line gave them. */
  etdTime?: string | null;
  etaTime?: string | null;
};

/** What a booking takes from its sailing: the ship, the voyage, the dates with their hours and the closings. */
export function bookingFieldsOf(v: Sailing, rules: CutoffRules) {
  return {
    vesselName: v.name,
    voyage: v.voyage,
    etd: v.etd,
    etdTime: v.etd ? (v.etdTime ?? null) : null,
    eta: v.eta,
    etaTime: v.eta ? (v.etaTime ?? null) : null,
    ...(v.etd
      ? cutoffsFor(v.etd, rules)
      : (Object.fromEntries(
          CUTOFF_KEYS.flatMap((k) => [
            [k, null],
            [cutoffTimeKey(k), null],
          ]),
        ) as Record<CutoffKey | CutoffTimeKey, null>)),
  };
}

/** A sailing's line in a picker: "MSC ROMA · FA534A — BEANR › CMDLA · ETD 2026-08-28". */
export const sailingLabel = (v: Sailing & { pol: string | null; pod: string | null }) =>
  `${v.name} · ${v.voyage} — ${v.pol ?? "?"} › ${v.pod ?? "?"}${v.etd ? ` · ETD ${v.etd}` : ""}`;

export function sailingProblem(v: { etd: string | null; eta: string | null }): string | null {
  return v.etd && v.eta && v.eta < v.etd ? "The ETA is before the ETD." : null;
}

/**
 * A date typed over the sailing's (legacy scheduleConflict, etdManual): nothing may leave the
 * office carrying a sailing the ship has moved past. The booking's own dates are the override;
 * the register's are the truth; each difference is named so the desk can see which to fix.
 */
export function scheduleConflict(
  b: { etd: string | null; eta: string | null },
  v: { etd: string | null; eta: string | null } | null | undefined,
): string[] {
  if (!v) return [];
  const out: string[] = [];
  if (b.etd && v.etd && b.etd !== v.etd)
    out.push(`the page says the ship leaves ${b.etd}, the register says ${v.etd}`);
  if (b.eta && v.eta && b.eta !== v.eta)
    out.push(`the page says it arrives ${b.eta}, the register says ${v.eta}`);
  return out;
}
