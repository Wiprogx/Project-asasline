/**
 * A moment of the office's day: a "YYYY-MM-DD" day and an "HH:MM" hour kept as two strings
 * (invariant 4), asked and shown as one field. The office works to the quarter hour (legacy
 * QH list, qhSnap): a truck comes at 07:15, a closing is at 12:00 — never 11:20.
 */

/** The step of every date-and-hour field, in seconds: a quarter of an hour. */
export const QUARTER_HOUR_SECONDS = 900;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" is a real hour of the day. */
export const isTime = (s: string | null | undefined): s is string => !!s && TIME.test(s);

/** The hour rounded to the nearest quarter (legacy qhSnap): "11:20" → "11:15", "23:53" → "23:45". */
export function snapQuarterHour(time: string): string {
  if (!isTime(time)) return time;
  const [h, m] = time.split(":").map(Number);
  const quarter = Math.min(45, Math.round(m / 15) * 15);
  return `${String(h).padStart(2, "0")}:${String(quarter).padStart(2, "0")}`;
}

/**
 * What a date-and-hour field shows: "YYYY-MM-DDTHH:MM", midnight standing in for a day whose
 * hour is not known (the field cannot show a day alone); nothing without a day.
 */
export const joinMoment = (date: string | null | undefined, time: string | null | undefined) =>
  date ? `${date}T${isTime(time) ? time : "00:00"}` : "";

/** The day and the hour a date-and-hour field was set to; both null when it was cleared. */
export function splitMoment(value: string): { date: string | null; time: string | null } {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return m ? { date: m[1], time: m[2] } : { date: null, time: null };
}

/** A moment in words, on paper and in a list: "2026-11-12 08:00", the day alone without an hour. */
export const momentWords = (date: string | null | undefined, time: string | null | undefined) =>
  date ? [date, time].filter(Boolean).join(" ") : "";
