/**
 * Three levels of being told (legacy NOTIFY_LEVELS): what stops a shipment reaches its owner
 * at once; what falls due today rings the bell in the app; what merely happened is written in
 * the history and that is all. Nothing is ever sent to everybody. The level of an open task
 * is read from the rule that made it (a blocking document step), never stored.
 */
export const NOTIFY_LEVELS = [
  {
    key: "stop",
    label: "Stops a shipment",
    how: "The bell, red, at once",
    eg: "A blocking document is late · a customer calls whose box is on the port cut-off",
  },
  {
    key: "today",
    label: "Due today",
    how: "The bell in the app",
    eg: "A step falls due · a missed call to return",
  },
  {
    key: "news",
    label: "Something happened",
    how: "History only — no notification",
    eg: "The vessel sailed · the container arrived",
  },
] as const;
export type NotifyLevel = (typeof NOTIFY_LEVELS)[number]["key"];

export type BellCounts = {
  /** My open tasks past their day. */
  overdue: number;
  /** My open tasks due today. */
  today: number;
  /** Among them, the steps that stop a shipment (a blocking rule) at or past their day. */
  stop: number;
};

export type Bell = { level: NotifyLevel; count: number; label: string };

/** What the bell shows: the highest level with something in it, and how many things want me. */
export function bellOf(c: BellCounts): Bell {
  const count = c.overdue + c.today;
  const parts = [
    c.stop > 0 && `${c.stop} stopping a shipment`,
    c.overdue > 0 && `${c.overdue} overdue`,
    c.today > 0 && `${c.today} due today`,
  ].filter((x): x is string => !!x);
  return {
    level: c.stop > 0 ? "stop" : count > 0 ? "today" : "news",
    count,
    label: count === 0 ? "Nothing due today" : `${count} to do: ${parts.join(", ")}`,
  };
}
