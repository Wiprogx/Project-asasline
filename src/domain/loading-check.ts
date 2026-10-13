import { dayNumber } from "./dates";
import { type BookingLoading, boxLoading, type LoadingMode, modeByName } from "./loading";

/**
 * Was the loading longer than agreed (legacy loadingCheckBox, chargeExtraTime)? A direct
 * loading is measured from the box's loading time to the finish the CMR proves, against the
 * mode's agreed hours plus a grace; a box dropped on site is counted in days, from the drop to
 * the pick-back. Times are "YYYY-MM-DD" + "HH:MM" strings, no clock read (invariant 4).
 */
export const DEFAULT_GRACE_MINUTES = 15;

type Moment = { date: string | null; time: string | null };

/** Hours from one moment to another, or null when either is incomplete. */
export function hoursBetween(from: Moment, to: Moment): number | null {
  if (!from.date || !from.time || !to.date || !to.time) return null;
  const minutes = (m: Moment) => {
    const [h, mi] = m.time!.split(":").map(Number);
    return dayNumber(m.date) * 1440 + h * 60 + mi;
  };
  return (minutes(to) - minutes(from)) / 60;
}

export type LoadingCheck =
  | { state: "pending"; message: string }
  | {
      state: "measured";
      drop: boolean;
      hours: number;
      /** Hours over the agreed time (direct), or days beyond the first (drop). */
      over: number;
      /** What to charge: hours rounded up past the grace, or days beyond the first; 0 = nothing. */
      chargeQty: number;
      message: string;
    };

const one = (n: number) => Math.round(n * 10) / 10;

export function loadingCheck(
  mode: LoadingMode | null | undefined,
  box: {
    loadDate: string | null;
    loadTime: string | null;
    loadEndDate: string | null;
    loadEndTime: string | null;
    pickBackDate: string | null;
    pickBackTime: string | null;
  },
  graceMinutes = DEFAULT_GRACE_MINUTES,
): LoadingCheck | null {
  if (!mode) return null;
  const start = { date: box.loadDate, time: box.loadTime };
  if (mode.drop) {
    const h = hoursBetween(start, { date: box.pickBackDate, time: box.pickBackTime });
    if (h === null)
      return {
        state: "pending",
        message: "Drop-off agreed — record the drop and the pick-back to count the days on site.",
      };
    const days = Math.max(0, Math.ceil(h / 24));
    const over = Math.max(0, days - 1);
    return {
      state: "measured",
      drop: true,
      hours: Math.round(h),
      over,
      chargeQty: over,
      message: `The box stayed ${days} day${days === 1 ? "" : "s"} (${Math.round(h)}h) at the customer.`,
    };
  }
  if (!box.loadDate || !box.loadTime) return null;
  const h = hoursBetween(start, { date: box.loadEndDate, time: box.loadEndTime });
  if (h === null)
    return {
      state: "pending",
      message: `Agreed ${mode.hours}h — record when the loading finished (the CMR) to compare.`,
    };
  const over = h - mode.hours;
  const billable = over > graceMinutes / 60;
  return {
    state: "measured",
    drop: false,
    hours: one(h),
    over: one(Math.max(0, over)),
    chargeQty: billable ? Math.ceil(over) : 0,
    message: billable
      ? `Took ${one(h)}h against ${mode.hours}h agreed — ${one(over)}h over.`
      : `Took ${one(h)}h, within the ${mode.hours}h agreed.`,
  };
}

/** The catalogue item the extra time is charged with: waiting time, or detention/storage for a drop. */
export const extraTimeItem = <T extends { label: string }>(items: readonly T[], drop: boolean) =>
  items.find((i) => (drop ? /detention|storage/i : /waiting/i).test(i.label)) ?? null;

type BoxTimes = Parameters<typeof loadingCheck>[1] & {
  loadAddress: string | null;
  loadingMode: string | null;
};

/** Every box of a booking measured against its own mode; the booking's details stand in for one box. */
export function loadingChecks(
  b: Omit<BookingLoading, "boxCount">,
  boxes: readonly BoxTimes[],
  modes: readonly LoadingMode[],
  graceMinutes = DEFAULT_GRACE_MINUTES,
) {
  return boxes.map((c) => {
    const l = boxLoading({ ...b, boxCount: boxes.length }, c);
    const mode = modeByName(modes, l.mode);
    return loadingCheck(mode, { ...c, loadDate: l.date, loadTime: l.time }, graceMinutes);
  });
}
