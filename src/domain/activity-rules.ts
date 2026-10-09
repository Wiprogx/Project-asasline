import { addDays } from "./dates";
import { type Role, ROLES } from "./permissions";

/**
 * Automatic activities (legacy ACTIVITY_RULES, autoActivity): when something happens in the
 * office, a task opens for somebody with a due day, so nothing waits on memory. Each rule is a
 * row of the `activityRules` Settings table; these are the legacy defaults.
 */
export const TRIGGERS = [
  "quote_created",
  "quote_sent",
  "dest_added",
  "booking_created",
  "sailing_moved",
  "doc_missing",
  "invoice_overdue",
] as const;
export type Trigger = (typeof TRIGGERS)[number];

export const TRIGGER_LABEL: Record<Trigger, string> = {
  quote_created: "Quotation created",
  quote_sent: "Quotation sent",
  dest_added: "Destination added",
  booking_created: "Booking created",
  sailing_moved: "Sailing moved",
  doc_missing: "Document still missing",
  invoice_overdue: "Invoice overdue",
};

export type ActivityRule = {
  trigger: Trigger;
  label: string;
  /** With {ref}, {client} and {dest} filled in. */
  title: string;
  type: string;
  role: Role;
  /** Days from today to the due day. */
  days: number;
  active: boolean;
};

/** Seed for the `activityTypes` list (legacy ACTIVITY_TYPES). */
export const DEFAULT_ACTIVITY_TYPES = [
  "Email",
  "Call",
  "Upload a document",
  "To do",
  "Meeting",
  "Approve",
  "Reminder",
];

export const DEFAULT_ACTIVITY_RULES: ActivityRule[] = [
  {
    trigger: "quote_created",
    label: "Quotation created",
    title: "Send quotation {ref} to {client}",
    type: "Email",
    role: "docs_clerk",
    days: 0,
    active: true,
  },
  {
    trigger: "quote_sent",
    label: "Quotation sent",
    title: "Ask {client} whether {ref} is agreed",
    type: "Call",
    role: "docs_clerk",
    days: 1,
    active: true,
  },
  {
    trigger: "dest_added",
    label: "Destination added",
    title: "Quote {dest} to {client}",
    type: "Email",
    role: "docs_clerk",
    days: 0,
    active: true,
  },
  {
    trigger: "booking_created",
    label: "Booking created",
    title: "Confirm booking {ref} with the carrier",
    type: "Approve",
    role: "docs_clerk",
    days: 1,
    active: true,
  },
  {
    trigger: "sailing_moved",
    label: "Sailing moved",
    title: "Tell {client} the new cut-offs for {ref}",
    type: "Email",
    role: "docs_clerk",
    days: 0,
    active: true,
  },
  {
    trigger: "doc_missing",
    label: "Document still missing",
    title: "Chase missing documents for {ref}",
    type: "Reminder",
    role: "docs_clerk",
    days: 2,
    active: false,
  },
  {
    trigger: "invoice_overdue",
    label: "Invoice overdue",
    title: "Chase payment for invoice {ref}",
    type: "Call",
    role: "accountant",
    days: 1,
    active: false,
  },
];

export type RuleVars = { ref: string; client: string; dest?: string };

export const fillTitle = (tpl: string, v: RuleVars) =>
  tpl
    .replace(/\{ref\}/g, v.ref)
    .replace(/\{client\}/g, v.client)
    .replace(/\{dest\}/g, v.dest ?? "")
    .replace(/\s{2,}/g, " ")
    .trim();

/** The task a trigger opens today, or null when no active rule wants one. */
export function taskFor(
  rules: readonly ActivityRule[],
  trigger: Trigger,
  vars: RuleVars,
  today: string,
): { title: string; type: string; role: Role; due: string } | null {
  const rule = rules.find((r) => r.trigger === trigger && r.active);
  if (!rule) return null;
  return {
    title: fillTitle(rule.title, vars),
    type: rule.type,
    role: rule.role,
    due: addDays(today, rule.days),
  };
}

/* ---- the Settings table, one rule per line ----------------------------------------------- */

export const activityRuleLines = (rules: readonly ActivityRule[]) =>
  rules
    .map((r) =>
      [r.trigger, r.label, r.title, r.type, r.role, String(r.days), r.active ? "on" : "off"].join(
        " | ",
      ),
    )
    .join("\n");

export function parseActivityRuleLines(text: string): {
  rules: ActivityRule[];
  problems: string[];
} {
  const rules: ActivityRule[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [
        trigger = "",
        label = "",
        title = "",
        type = "To do",
        role = "docs_clerk",
        days = "0",
        active = "on",
      ] = line.split("|").map((x) => x.trim());
      const n = Number(days);
      if (!(TRIGGERS as readonly string[]).includes(trigger))
        problems.push(`Line ${i + 1}: a trigger among ${TRIGGERS.join(", ")}.`);
      else if (!label || label.length > 60)
        problems.push(`Line ${i + 1}: a label (up to 60 characters).`);
      else if (!title || title.length > 200)
        problems.push(`Line ${i + 1}: the task title, with {ref}, {client} or {dest}.`);
      else if (!type || type.length > 40) problems.push(`Line ${i + 1}: a task type.`);
      else if (!(ROLES as readonly string[]).includes(role))
        problems.push(`Line ${i + 1}: a role among ${ROLES.join(", ")}.`);
      else if (!Number.isInteger(n) || n < 0 || n > 365)
        problems.push(`Line ${i + 1}: the days as a whole number, 0 to 365.`);
      else if (active !== "on" && active !== "off")
        problems.push(`Line ${i + 1}: "on" or "off" last.`);
      else
        rules.push({
          trigger: trigger as Trigger,
          label,
          title,
          type,
          role: role as Role,
          days: n,
          active: active === "on",
        });
    });
  return { rules, problems };
}
