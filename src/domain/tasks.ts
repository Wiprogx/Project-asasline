import { addDays, dayNumber, dayOfWeek, formatYmd, monthLength, parseYmd } from "./dates";
import type { Role } from "./permissions";
import type { Tone } from "./shipments";

/**
 * Tasks (legacy Activity). A task is owned by a person, or addressed to a role and picked up
 * by whoever holds it (roles, not names — invariant 3). Nothing is deleted: a task is done,
 * or withdrawn with a reason, and both can be undone.
 */
export const TASK_STATES = ["open", "done", "withdrawn"] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const BUCKETS = ["overdue", "today", "upcoming", "undated"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_META: Record<Bucket, { label: string; tone: Tone }> = {
  overdue: { label: "Overdue", tone: "danger" },
  today: { label: "Today", tone: "warning" },
  upcoming: { label: "Upcoming", tone: "success" },
  undated: { label: "No date", tone: "neutral" },
};

/** Traffic light of an open task against the office's today. A bad date is "undated", not green. */
export function bucketOf(due: string | null, today: string): Bucket {
  const d = dayNumber(due);
  if (Number.isNaN(d)) return "undated";
  const t = dayNumber(today);
  return d < t ? "overdue" : d === t ? "today" : "upcoming";
}

/**
 * "My tasks": assigned to me, or addressed to my role and not yet taken by anyone. A task for
 * a role nobody picked up must appear somewhere, or it silently waits for ever.
 */
export function isMine(
  task: { assigneeId: string | null; role: Role | null },
  me: { id: string; role: Role },
): boolean {
  if (task.assigneeId) return task.assigneeId === me.id;
  return task.role === me.role;
}

/** A task must be owned by a person or addressed to a role — never by nobody. */
export function ownerProblem(
  assigneeId: string | null | undefined,
  role: string | null | undefined,
) {
  return assigneeId || role ? null : "Choose a person or a role.";
}

/** "2026-09" → the month's first day, or null. */
export function monthStart(month: string): string | null {
  const p = parseYmd(`${month}-01`);
  return p ? formatYmd(p) : null;
}

/** The month before or after, as "YYYY-MM". */
export function shiftMonth(month: string, by: number): string {
  const p = parseYmd(`${month}-01`);
  if (!p) return month;
  const total = p.y * 12 + (p.m - 1) + by;
  return `${String(Math.floor(total / 12)).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * The weeks of a month calendar, Monday first (Belgian office), padded with the neighbouring
 * months' days so every week has seven. Each cell says whether it belongs to the month.
 */
export function monthGrid(month: string): { day: string; inMonth: boolean }[][] {
  const first = monthStart(month);
  if (!first) return [];
  const p = parseYmd(first)!;
  const lead = (dayOfWeek(first) + 6) % 7; // Monday = 0
  const cells = lead + monthLength(p.y, p.m);
  const weeks = Math.ceil(cells / 7);
  const start = addDays(first, -lead);
  const prefix = first.slice(0, 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(start, w * 7 + d);
      return { day, inMonth: day.startsWith(prefix) };
    }),
  );
}

export type TaskMove = "complete" | "reopen" | "withdraw" | "putBack";

const MOVES: Record<TaskMove, { from: TaskState; to: TaskState }> = {
  complete: { from: "open", to: "done" },
  reopen: { from: "done", to: "open" },
  withdraw: { from: "open", to: "withdrawn" },
  putBack: { from: "withdrawn", to: "open" },
};

/** The state a move leads to, or null when the task is not in the state the move starts from. */
export function nextState(state: TaskState, move: TaskMove): TaskState | null {
  return MOVES[move].from === state ? MOVES[move].to : null;
}
