/**
 * How a box is loaded and how long the truck may stay (legacy LOADING_MODES, BOX_DEF,
 * boxLoadAddr / boxWhen / boxMode2, truckerCopyGaps). At quotation stage the mode is a price
 * decision — how many loading hours the price includes, or that the box is left on site; on
 * the booking it is a schedule, one per box. A mode can cost extra (a long wait, a second trip
 * for a drop-off): the surcharge is an ordinary catalogue item, named here by its name.
 */
export type LoadingMode = {
  name: string;
  /** Loading hours included in the price; 0 when the box is left on site. */
  hours: number;
  /** The box is dropped and collected later: days on site are charged from the free time. */
  drop: boolean;
  /** The catalogue item charged on top, by name, and how many of it; null when none. */
  surcharge: string | null;
  qty: number;
};

const direct = (hours: number, qty = 0): LoadingMode => ({
  name: `Direct loading — ${hours} hour${hours === 1 ? "" : "s"}`,
  hours,
  drop: false,
  surcharge: qty ? "Waiting time at loading (per hour)" : null,
  qty,
});

/** Seed for the `loadingModes` Settings table; the running app reads the table. */
export const DEFAULT_LOADING_MODES: LoadingMode[] = [
  direct(1),
  direct(2),
  ...[3, 4, 5, 6, 7, 8, 9, 10].map((h) => direct(h, h - 2)),
  {
    name: "Drop off container on ground",
    hours: 0,
    drop: true,
    surcharge: "Container re-positioning",
    qty: 1,
  },
  {
    name: "Disconnect chassis",
    hours: 0,
    drop: true,
    surcharge: "Container re-positioning",
    qty: 1,
  },
];

export const modeByName = (modes: readonly LoadingMode[], name: string | null | undefined) =>
  (name && modes.find((m) => m.name === name)) || null;

export const isDropMode = (modes: readonly LoadingMode[], name: string | null | undefined) =>
  modeByName(modes, name)?.drop ?? false;

/** What the chosen mode means for the price, in the words shown under the field (legacy lmNote). */
export function modeNote(modes: readonly LoadingMode[], name: string | null | undefined): string {
  const m = modeByName(modes, name);
  if (!m) return "Pick one — the price depends on it.";
  if (m.drop)
    return "Box left on site — no loading hours included. Days on site are charged from the free-time terms; the box says when it is delivered and when it is picked back.";
  return `${m.hours} hour${m.hours === 1 ? "" : "s"} of loading included in this price. Anything beyond is charged as waiting time.`;
}

/* ---- the Settings table, one mode per row ------------------------------------------------- */

/** One row of Settings › Loading modes as the form posts it: every cell a string. */
export type LoadingModeRow = {
  name: string;
  hours: string;
  kind: string;
  surcharge: string;
  qty: string;
};

/** A mode as the list shows it; the quantity left empty means once when there is a surcharge. */
export const loadingModeRow = (m: LoadingMode): LoadingModeRow => ({
  name: m.name,
  hours: String(m.hours),
  kind: m.drop ? "drop" : "direct",
  surcharge: m.surcharge ?? "",
  qty: m.qty ? String(m.qty) : "",
});

/** The rows read back; a problem names its row, the first problem of each row only. */
export function loadingModesFromRows(rows: readonly LoadingModeRow[]): {
  modes: LoadingMode[];
  problems: string[];
} {
  const modes: LoadingMode[] = [];
  const problems: string[] = [];
  rows.forEach((r, i) => {
    const name = r.name.trim();
    const surcharge = r.surcharge.trim();
    const h = Number(r.hours.trim() || "0");
    const qty = r.qty.trim();
    const q = qty === "" ? (surcharge ? 1 : 0) : Number(qty);
    if (!name || name.length > 80) problems.push(`Row ${i + 1}: a name (up to 80 characters).`);
    else if (!Number.isInteger(h) || h < 0 || h > 48)
      problems.push(`Row ${i + 1}: hours as a whole number, 0 to 48.`);
    else if (r.kind !== "direct" && r.kind !== "drop")
      problems.push(`Row ${i + 1}: direct loading or a drop-off.`);
    else if (!Number.isInteger(q) || q < 0 || q > 50)
      problems.push(`Row ${i + 1}: the quantity as a whole number.`);
    else if (modes.some((m) => m.name === name)) problems.push(`Row ${i + 1}: "${name}" twice.`);
    else
      modes.push({ name, hours: h, drop: r.kind === "drop", surcharge: surcharge || null, qty: q });
  });
  return { modes, problems };
}

/* ---- the stops of a box ------------------------------------------------------------------ */

/**
 * Another place the truck calls at for this box (legacy stopRow): a location contact
 * (`placeId` — none on a box from before or a legacy import) and its words as written when the
 * box was saved, which the trucker copy prints, when the truck is expected there, how the box
 * is handled there (a loading mode of its own, as the quotation agreed it; none on a stop from
 * before) and, dropped there, when it is picked back.
 */
export type Stop = {
  placeId?: string | null;
  address: string;
  date: string | null;
  time: string | null;
  loadingMode?: string | null;
  pickBackDate?: string | null;
  pickBackTime?: string | null;
};

/* ---- what a driver is told, and what is still missing ------------------------------------ */

export type BookingLoading = {
  loadAddress: string | null;
  loadDate: string | null;
  loadTime: string | null;
  loadingMode: string | null;
  /** How many live boxes the booking has: the booking's own details stand in for one box only. */
  boxCount: number;
};

export type BoxLoadingFields = {
  loadAddress: string | null;
  loadDate: string | null;
  loadTime: string | null;
  loadingMode: string | null;
};

/**
 * A box's loading details. Nothing is inherited between boxes: a missing detail is missing,
 * and the booking-level value stands in only when there is genuinely one box — two drivers
 * sent to one address at one hour was the legacy bug this guards against (BUILD_PLAN 1.10).
 */
export function boxLoading(b: BookingLoading, c: BoxLoadingFields) {
  const one = b.boxCount < 2;
  const date = c.loadDate ?? (one ? b.loadDate : null);
  // the hour belongs to the same box as the date — never mixed across boxes
  const time = c.loadDate ? c.loadTime : one ? b.loadTime : null;
  return {
    address: c.loadAddress ?? (one ? b.loadAddress : null),
    date,
    time: date ? time : null,
    mode: c.loadingMode ?? (one ? b.loadingMode : null),
  };
}

/** What a trucker copy is missing before it can go out (legacy truckerCopyGaps). */
export function truckerCopyGaps(
  b: BookingLoading,
  c: BoxLoadingFields & { number: string | null },
): string[] {
  const l = boxLoading(b, c);
  const gaps: string[] = [];
  if (!l.address) gaps.push("loading address");
  if (!l.date) gaps.push("loading date");
  if (!l.mode) gaps.push("loading mode");
  if (!c.number) gaps.push("container number");
  return gaps;
}
