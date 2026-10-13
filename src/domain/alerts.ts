import type { Tone } from "./shipments";

/**
 * A booking's alerts (legacy b.alerts, addAl/resAl): a line the desk raises for everyone who
 * opens the file — an urgent problem, a warning, or plain information — and resolves when it no
 * longer holds. Resolved, never removed: the history keeps what was said.
 */
export const ALERT_LEVELS = ["urgent", "alert", "info"] as const;
export type AlertLevel = (typeof ALERT_LEVELS)[number];

export const ALERT_META: Record<AlertLevel, { label: string; tone: Tone }> = {
  urgent: { label: "Urgent", tone: "danger" },
  alert: { label: "Alert", tone: "warning" },
  info: { label: "Info", tone: "info" },
};

type Raised = {
  level: AlertLevel;
  text: string;
  resolvedAt: Date | string | null;
  createdAt: Date | string;
};

/** The open alerts, the most serious first, then the newest (legacy: unresolved, in order). */
export function openAlerts<T extends Raised>(alerts: readonly T[]): T[] {
  const rank = (l: AlertLevel) => ALERT_LEVELS.indexOf(l);
  return alerts
    .filter((a) => !a.resolvedAt)
    .sort(
      (a, b) =>
        rank(a.level) - rank(b.level) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** What the bookings list shows for a file (legacy lastAlert): its most serious open alert. */
export const headline = <T extends Raised>(alerts: readonly T[]) => openAlerts(alerts)[0] ?? null;
