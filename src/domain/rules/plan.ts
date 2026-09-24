import type { Role } from "../permissions";
import type { Holiday } from "./calendar";
import {
  applicableRules,
  type BookingFacts,
  type DocRule,
  type Due,
  dueOf,
  fillStep,
  missingPrerequisites,
} from "./engine";

export type StepStatus = "done" | "open" | "waiting";

export type PlanBox = { id: string; label: string };

export type PlanStep = {
  rule: DocRule;
  /** What identifies the step on the booking: the rule's code, or `CODE#boxId` per box. */
  key: string;
  /** The box, for a rule that makes one step per container (legacy perBox). */
  box: PlanBox | null;
  title: string;
  due: Due;
  status: StepStatus;
  waitingOn: string[];
};

export const stepKey = (code: string, box: PlanBox | null) => (box ? `${code}#${box.id}` : code);
export const codeOfKey = (key: string) => key.split("#")[0];

/** A booking with no box yet gets one step for a per-box rule, as a booking has one box. */
function boxesOf(rule: DocRule, b: BookingFacts): (PlanBox | null)[] {
  if (!rule.perBox || !b.boxes?.length) return [null];
  return b.boxes.map((x) => ({ id: x.id, label: x.label }));
}

/** What a rule waits for before its box is weighed: every box's cargo weight (legacy weightsReady). */
function notReady(rule: DocRule, b: BookingFacts): string[] {
  if (rule.ready !== "weights") return [];
  const boxes = b.boxes ?? [];
  if (boxes.length === 0) return ["the containers"];
  return boxes.filter((x) => !x.weightsIn).map((x) => `the weight of ${x.label}`);
}

/**
 * The document chain of one booking: every applicable rule with its due day and status, one
 * step per container for a per-box rule. `settled` = keys whose step is done or deliberately
 * withdrawn (a withdrawal carries a reason, and a chain that could never move past it would be
 * worse than useless). A prerequisite made per box is settled once every box's step is.
 */
export function planChain(
  book: readonly DocRule[],
  b: BookingFacts,
  holidays: readonly Holiday[],
  settled: ReadonlySet<string>,
): PlanStep[] {
  const live = applicableRules(book, b);
  const settledCodes = new Set(
    live
      .filter((r) => boxesOf(r, b).every((box) => settled.has(stepKey(r.code, box))))
      .map((r) => r.code),
  );
  return live
    .flatMap((rule) =>
      boxesOf(rule, b).map((box): PlanStep => {
        const key = stepKey(rule.code, box);
        const waitingOn = [
          ...missingPrerequisites(rule, live, book, settledCodes),
          ...notReady(rule, b),
        ];
        const done = settled.has(key);
        const status: StepStatus = done ? "done" : waitingOn.length ? "waiting" : "open";
        const title = `${fillStep(rule.step, b)}${box ? ` — ${box.label}` : ""} — ${b.ref}`;
        return { rule, key, box, title, due: dueOf(rule, b, holidays), status, waitingOn };
      }),
    )
    .sort((x, y) => (x.due?.day ?? "9999").localeCompare(y.due?.day ?? "9999"));
}

export type RuleTask = {
  id: string;
  /** The step's key (the rule's code, or `CODE#boxId`). */
  ruleCode: string;
  state: "open" | "done" | "withdrawn";
  due: string | null;
};

export type SyncDiff = {
  create: { ruleCode: string; title: string; due: string | null; role: Role; blocking: boolean }[];
  redate: { id: string; due: string | null }[];
  withdraw: { id: string; reason: string }[];
};

/**
 * What must change so the tasks match the chain — pure, so it is tested, and idempotent, so
 * it can run after every change: a step opens once its prerequisites are settled; an open
 * step follows its anchor when the ship's dates move; a step whose rule no longer applies
 * (or whose box left the booking) is withdrawn with that reason, never deleted.
 */
export function syncDiff(plan: readonly PlanStep[], tasks: readonly RuleTask[]): SyncDiff {
  const diff: SyncDiff = { create: [], redate: [], withdraw: [] };
  const byKey = new Map(tasks.map((t) => [t.ruleCode, t]));
  const planned = new Set(plan.map((p) => p.key));

  for (const step of plan) {
    const task = byKey.get(step.key);
    const due = step.due?.day ?? null;
    if (!task) {
      if (step.status === "open")
        diff.create.push({
          ruleCode: step.key,
          title: step.title,
          due,
          role: step.rule.role,
          blocking: step.rule.blocking,
        });
    } else if (task.state === "open" && task.due !== due) {
      diff.redate.push({ id: task.id, due });
    }
  }
  for (const t of tasks)
    if (t.state === "open" && !planned.has(t.ruleCode))
      diff.withdraw.push({
        id: t.id,
        reason: t.ruleCode.includes("#")
          ? "The container left the booking"
          : "The document rule no longer applies to this booking",
      });
  return diff;
}
