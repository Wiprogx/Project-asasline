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

export type PlanStep = {
  rule: DocRule;
  title: string;
  due: Due;
  status: StepStatus;
  waitingOn: string[];
};

/**
 * The document chain of one booking: every applicable rule with its due day and status.
 * `settled` = codes whose step is done or deliberately withdrawn (a withdrawal carries a
 * reason, and a chain that could never move past it would be worse than useless).
 */
export function planChain(
  book: readonly DocRule[],
  b: BookingFacts,
  holidays: readonly Holiday[],
  settled: ReadonlySet<string>,
): PlanStep[] {
  const live = applicableRules(book, b);
  return live
    .map((rule): PlanStep => {
      const waitingOn = missingPrerequisites(rule, live, book, settled);
      const status: StepStatus = settled.has(rule.code)
        ? "done"
        : waitingOn.length
          ? "waiting"
          : "open";
      return {
        rule,
        title: `${fillStep(rule.step, b)} — ${b.ref}`,
        due: dueOf(rule, b, holidays),
        status,
        waitingOn,
      };
    })
    .sort((x, y) => (x.due?.day ?? "9999").localeCompare(y.due?.day ?? "9999"));
}

export type RuleTask = {
  id: string;
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
 * is withdrawn with that reason, never deleted.
 */
export function syncDiff(plan: readonly PlanStep[], tasks: readonly RuleTask[]): SyncDiff {
  const diff: SyncDiff = { create: [], redate: [], withdraw: [] };
  const byCode = new Map(tasks.map((t) => [t.ruleCode, t]));
  const planned = new Set(plan.map((p) => p.rule.code));

  for (const step of plan) {
    const task = byCode.get(step.rule.code);
    const due = step.due?.day ?? null;
    if (!task) {
      if (step.status === "open")
        diff.create.push({
          ruleCode: step.rule.code,
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
        reason: "The document rule no longer applies to this booking",
      });
  return diff;
}
