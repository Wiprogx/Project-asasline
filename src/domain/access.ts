import { addDays } from "./dates";

/**
 * Which acts of looking are worth recording (legacy ACCESS_WATCH): a Settings table, because
 * what counts as sensitive is a decision for the business, not for the program. Edits are not
 * here — they are written on the record itself; this holds what would otherwise leave no trace.
 */
export const ACCESS_KEYS = ["cost", "download", "export", "people", "price"] as const;
export type AccessKey = (typeof ACCESS_KEYS)[number];

export type AccessWatch = { key: AccessKey; label: string; on: boolean };

export const DEFAULT_ACCESS_WATCH: AccessWatch[] = [
  { key: "cost", label: "Cost and margin on a booking", on: true },
  { key: "download", label: "Downloading a document", on: true },
  { key: "export", label: "Exporting a list", on: true },
  { key: "people", label: "Another person's record", on: true },
  { key: "price", label: "A customer's price list", on: false },
];

export const watching = (list: readonly AccessWatch[], key: AccessKey) =>
  list.find((w) => w.key === key)?.on ?? false;

/* ---- what a person did, read in a window (legacy LOG_RANGES, userSummary) ---- */

export const LOG_RANGES = ["day", "week", "month", "all"] as const;
export type LogRange = (typeof LOG_RANGES)[number];
export const LOG_RANGE_LABEL: Record<LogRange, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  all: "Everything",
};

/** The window a range covers, ending today; "all" has no start. */
export function logWindow(range: LogRange, today: string): { from: string | null; to: string } {
  if (range === "day") return { from: today, to: today };
  if (range === "week") return { from: addDays(today, -6), to: today };
  if (range === "month") return { from: addDays(today, -29), to: today };
  return { from: null, to: today };
}

export type LogLine = { action: string; entity: string | null; entityId: string | null };

export type PersonSummary = {
  entries: number;
  bookings: number;
  quotations: number;
  messages: number;
  files: number;
  tasksClosed: number;
  looked: number;
};

/** The figures of a person's window: distinct records touched, messages sent, files filed, tasks closed, sensitive reads. */
export function personSummary(rows: readonly LogLine[]): PersonSummary {
  const distinct = (entity: string) =>
    new Set(rows.filter((r) => r.entity === entity && r.entityId).map((r) => r.entityId)).size;
  return {
    entries: rows.length,
    bookings: distinct("booking"),
    quotations: distinct("quotation"),
    messages: rows.filter((r) => r.action === "message.out").length,
    files: rows.filter((r) => /\.file\.add$/.test(r.action)).length,
    tasksClosed: rows.filter((r) => /^(task|activity)\.(done|close)/.test(r.action)).length,
    looked: rows.filter((r) => /^access\.|\.view$|\.download$|\.export$/.test(r.action)).length,
  };
}
