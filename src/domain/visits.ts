/**
 * Time at work (legacy TIMELOG, VISITS, the Settings "time" tab): the browser reports stretches
 * of real interaction, by app and by record; a gap longer than the idle cut-off is not work,
 * a glance shorter than a few seconds is not a visit. Nothing here reads a clock: the server
 * stamps the day, the browser measures the seconds.
 */
export const IDLE_CUTOFF_SECONDS = 120;
export const MIN_VISIT_SECONDS = 5;
/** The browser reports at most this often; a report above it is clamped (a tampered beacon). */
export const MAX_REPORT_SECONDS = 600;

export const APPS = [
  "home",
  "activity",
  "quotations",
  "bookings",
  "contacts",
  "discuss",
  "accounting",
  "settings",
] as const;
export type App = (typeof APPS)[number];
export const APP_LABEL: Record<App, string> = {
  home: "Home",
  activity: "Activity",
  quotations: "Quotations",
  bookings: "Bookings",
  contacts: "Contacts",
  discuss: "Discuss",
  accounting: "Accounting",
  settings: "Settings",
};

/** The app a path belongs to; an unknown first segment is counted as home. */
export function appOf(pathname: string): App {
  const first = pathname.split("?")[0].split("/").filter(Boolean)[0] ?? "";
  return (APPS as readonly string[]).includes(first) ? (first as App) : "home";
}

export type RecordKind = "booking" | "quotation" | "contact" | "invoice";
const RECORD_SEGMENT: Record<string, RecordKind> = {
  bookings: "booking",
  quotations: "quotation",
  contacts: "contact",
  invoices: "invoice",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The record a path is about (/bookings/<id>/..., /accounting/invoices/<id>), or null. */
export function recordOf(pathname: string): { kind: RecordKind; id: string } | null {
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  for (let i = 0; i + 1 < parts.length; i++) {
    const kind = RECORD_SEGMENT[parts[i]];
    if (kind && UUID.test(parts[i + 1])) return { kind, id: parts[i + 1].toLowerCase() };
  }
  return null;
}

/** "45s", "12m", "1h 05m" — time as the office reads it. */
export function hm(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export type TimeCell = { userId: string; app: string; seconds: number };

/** People × apps, each with its seconds and a total, from the day's (or window's) cells. */
export function timeTable(
  people: readonly { id: string; name: string }[],
  cells: readonly TimeCell[],
): { id: string; name: string; byApp: Record<App, number>; total: number }[] {
  return people.map((p) => {
    const byApp = Object.fromEntries(APPS.map((a) => [a, 0])) as Record<App, number>;
    for (const c of cells)
      if (c.userId === p.id && (APPS as readonly string[]).includes(c.app))
        byApp[c.app as App] += c.seconds;
    return { ...p, byApp, total: APPS.reduce((s, a) => s + byApp[a], 0) };
  });
}

/** A browser report, checked: the seconds clamped to what one report can honestly carry. */
export function checkedSeconds(seconds: unknown): number | null {
  const n = typeof seconds === "number" ? seconds : Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.round(n), MAX_REPORT_SECONDS);
}
