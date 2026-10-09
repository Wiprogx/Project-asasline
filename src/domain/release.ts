import type { Tone } from "./shipments";

/**
 * Where a shipment stands after it is booked (legacy RELEASE_STATES, SEND_MODES, PAPER_DOCS,
 * TRACK_STEPS): whether the consignee may collect, how the original papers travel, and the
 * journey's milestones ticked by hand until a carrier feed does it. Every list is a Settings
 * table; these are their defaults.
 */
export type ReleaseState = {
  code: string;
  label: string;
  /** A hold blocks collection until somebody here lifts it. */
  hold: boolean;
  hint: string;
};

export const DEFAULT_RELEASE_STATES: ReleaseState[] = [
  {
    code: "pending",
    label: "Not released yet",
    hold: false,
    hint: "Nothing decided — the default when a booking is created",
  },
  {
    code: "hold_ship",
    label: "Held — shipper instruction",
    hold: true,
    hint: "The shipper asked us not to release until they confirm",
  },
  {
    code: "hold_pay",
    label: "Held — payment outstanding",
    hold: true,
    hint: "Freight or charges still unpaid",
  },
  {
    code: "hold_docs",
    label: "Held — documents missing",
    hold: true,
    hint: "Originals, BESC or customs paperwork not complete",
  },
  {
    code: "telex",
    label: "Telex released",
    hold: false,
    hint: "Carrier released against a surrendered original",
  },
  { code: "released", label: "Released", hold: false, hint: "Consignee may collect the cargo" },
];

export const releaseState = (states: readonly ReleaseState[], code: string | null | undefined) =>
  states.find((s) => s.code === code) ?? states[0] ?? DEFAULT_RELEASE_STATES[0];

/** Red for a hold, green once released, grey while nothing is decided. */
export const releaseTone = (s: ReleaseState): Tone =>
  s.hold ? "danger" : s.code === "pending" ? "neutral" : "success";

export type SendMode = { name: string; tracks: boolean; url: string | null };

export const DEFAULT_SEND_MODES: SendMode[] = [
  { name: "DHL", tracks: true, url: "https://www.dhl.com/be-en/home/tracking.html?tracking-id=" },
  { name: "UPS", tracks: true, url: "https://www.ups.com/track?tracknum=" },
  { name: "FedEx", tracks: true, url: "https://www.fedex.com/fedextrack/?trknbr=" },
  {
    name: "TNT",
    tracks: true,
    url: "https://www.tnt.com/express/en_gc/site/shipping-tools/tracking.html?cons=",
  },
  { name: "By hand", tracks: false, url: null },
  { name: "Courier — local", tracks: false, url: null },
  {
    name: "Registered post",
    tracks: true,
    url: "https://track.bpost.cloud/btr/web/#/search?itemCode=",
  },
];

/** The courier's own page for this waybill, when the mode has one and a number was typed. */
export function trackingUrl(
  modes: readonly SendMode[],
  mode: string | null | undefined,
  tracking: string | null | undefined,
): string | null {
  const m = modes.find((x) => x.name === mode);
  const n = (tracking ?? "").trim();
  return m?.url && n ? m.url + encodeURIComponent(n) : null;
}

/** Document types whose originals travel on paper (legacy PACKAGE_DOCS): the originals block shows for them. */
export const DEFAULT_PAPER_DOCS = ["ORIGINAL BL", "CMR"];

export const isPaperDoc = (paperDocs: readonly string[], docType: string | null | undefined) =>
  paperDocs.some((p) => (docType ?? "").toUpperCase().includes(p.toUpperCase()));

/** A milestone; `template` is the letter that goes to the customer by itself when it is ticked (legacy autoSend). */
export type TrackStepDef = { name: string; source: "auto" | "manual"; template?: string };

export const DEFAULT_TRACK_STEPS: TrackStepDef[] = [
  { name: "Booking confirmed", source: "manual" },
  { name: "Trucker confirmed", source: "manual" },
  { name: "Container pickup", source: "auto", template: "PICKED_UP" },
  { name: "Arrival at terminal", source: "auto", template: "AT_TERMINAL" },
  { name: "Customs hold", source: "manual" },
  { name: "Vessel departure", source: "auto", template: "SAILED" },
  { name: "Transit", source: "auto" },
  { name: "Arrival at port", source: "auto", template: "ARRIVED" },
];

/** A booking's journey: the steps as they were when the journey started, each ticked or not. */
export type TrackStep = TrackStepDef & { done: boolean; date: string | null; place: string | null };

export const startTrack = (steps: readonly TrackStepDef[]): TrackStep[] =>
  steps.map((s) => ({ ...s, done: false, date: null, place: null }));

/** The journey as it stands: the steps with the one current, "Not started" before the first. */
export function journey(track: readonly TrackStep[]) {
  const next = track.findIndex((t) => !t.done);
  const current =
    next === -1 ? (track[track.length - 1] ?? null) : next > 0 ? track[next - 1] : null;
  return { next, current, stage: current ? current.name : "Not started" };
}

/** Flip one step; a step just done carries the day it was done (legacy tglTrack). */
export function toggleStep(track: readonly TrackStep[], index: number, today: string): TrackStep[] {
  return track.map((t, i) =>
    i === index ? { ...t, done: !t.done, date: t.done ? null : (t.date ?? today) } : t,
  );
}

/* ---- the Settings tables, one entry per line ---------------------------------------------- */

const yes = (b: boolean, a: string, z: string) => (b ? a : z);

export const releaseStateLines = (states: readonly ReleaseState[]) =>
  states
    .map((s) => `${s.code} | ${s.label} | ${yes(s.hold, "hold", "free")} | ${s.hint}`)
    .join("\n");

export function parseReleaseStateLines(text: string): {
  states: ReleaseState[];
  problems: string[];
} {
  const states: ReleaseState[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [code = "", label = "", kind = "free", hint = ""] = line
        .split("|")
        .map((x) => x.trim());
      if (!/^[a-z][a-z0-9_]{1,30}$/.test(code))
        problems.push(`Line ${i + 1}: a code in lowercase (hold_pay).`);
      else if (!label || label.length > 60)
        problems.push(`Line ${i + 1}: a label (up to 60 characters).`);
      else if (kind !== "hold" && kind !== "free")
        problems.push(`Line ${i + 1}: "hold" or "free" in the third place.`);
      else if (hint.length > 200) problems.push(`Line ${i + 1}: a hint up to 200 characters.`);
      else if (states.some((s) => s.code === code)) problems.push(`Line ${i + 1}: ${code} twice.`);
      else states.push({ code, label, hold: kind === "hold", hint });
    });
  return { states, problems };
}

export const sendModeLines = (modes: readonly SendMode[]) =>
  modes
    .map((m) =>
      [m.name, yes(m.tracks, "tracks", "no"), m.url ?? ""].join(" | ").replace(/(\s\|\s*)+$/, ""),
    )
    .join("\n");

export function parseSendModeLines(text: string): { modes: SendMode[]; problems: string[] } {
  const modes: SendMode[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [name = "", kind = "no", url = ""] = line.split("|").map((x) => x.trim());
      if (!name || name.length > 60) problems.push(`Line ${i + 1}: a name (up to 60 characters).`);
      else if (kind !== "tracks" && kind !== "no")
        problems.push(`Line ${i + 1}: "tracks" or "no" in the second place.`);
      else if (url && !/^https:\/\/\S+$/.test(url))
        problems.push(
          `Line ${i + 1}: the tracking page as an https address, the number appended to it.`,
        );
      else if (modes.some((m) => m.name === name)) problems.push(`Line ${i + 1}: ${name} twice.`);
      else modes.push({ name, tracks: kind === "tracks", url: url || null });
    });
  return { modes, problems };
}

export const trackStepLines = (steps: readonly TrackStepDef[]) =>
  steps
    .map((s) =>
      s.template ? `${s.name} | ${s.source} | ${s.template}` : `${s.name} | ${s.source}`,
    )
    .join("\n");

export function parseTrackStepLines(text: string): { steps: TrackStepDef[]; problems: string[] } {
  const steps: TrackStepDef[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [name = "", source = "manual", template = ""] = line.split("|").map((x) => x.trim());
      if (!name || name.length > 60) problems.push(`Line ${i + 1}: a name (up to 60 characters).`);
      else if (source !== "auto" && source !== "manual")
        problems.push(`Line ${i + 1}: "auto" or "manual" in the second place.`);
      else if (template && !/^[A-Z][A-Z0-9_]{1,29}$/.test(template))
        problems.push(`Line ${i + 1}: a template code in capitals in the third place, or nothing.`);
      else if (steps.some((s) => s.name === name)) problems.push(`Line ${i + 1}: ${name} twice.`);
      else steps.push(template ? { name, source, template } : { name, source });
    });
  return { steps, problems };
}
