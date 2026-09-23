/**
 * Payment reminders and the credit limit (legacy REMIND_STEPS / remindLevel / remindText /
 * exposure). A reminder is written by a person, never sent by itself; the steps only say
 * which one is due, and a customer is never reminded twice within ten days.
 */
import { daysBetween } from "./dates";
import { formatCents } from "./money";

export const REMIND_STEPS = [
  { level: 1, after: 1, name: "Friendly reminder" },
  { level: 2, after: 15, name: "Second reminder" },
  { level: 3, after: 30, name: "Last notice before collection" },
] as const;
export type RemindStep = (typeof REMIND_STEPS)[number];

export const REMIND_GAP_DAYS = 10;

/** The reminder due on an invoice today, or null: open, late enough, and not reminded lately. */
export function remindStep(i: {
  dueDate: string | null;
  openCents: number;
  today: string;
  last: { level: number; sentOn: string } | null;
}): RemindStep | null {
  if (!i.dueDate || i.openCents <= 0 || i.dueDate >= i.today) return null;
  if (i.last && daysBetween(i.last.sentOn, i.today) < REMIND_GAP_DAYS) return null;
  const late = daysBetween(i.dueDate, i.today);
  return REMIND_STEPS.find((s) => late >= s.after && s.level > (i.last?.level ?? 0)) ?? null;
}

const OPENING: Record<RemindStep["level"], string> = {
  1: "Our records show that the invoice below is still open. It may have crossed with your payment — if so, please ignore this message.",
  2: "We sent you a reminder about the invoice below and have not yet received the payment.",
  3: "Despite our reminders the invoice below is still unpaid. Without payment within 8 days we will have to hand the file over for collection.",
};

const PREFIX: Record<RemindStep["level"], string> = {
  1: "Reminder",
  2: "Second reminder",
  3: "Last notice",
};

export function reminderText(r: {
  step: RemindStep;
  customer: string;
  number: string;
  issueDate: string;
  dueDate: string;
  openCents: number;
  iban: string;
  ogm: string | null;
  signer: string;
  company: string;
}): { subject: string; body: string } {
  return {
    subject: `${PREFIX[r.step.level]} — invoice ${r.number}`,
    body: [
      `Dear ${r.customer},`,
      "",
      OPENING[r.step.level],
      "",
      `Invoice ${r.number} of ${r.issueDate} — due ${r.dueDate}`,
      `Still open: ${formatCents(r.openCents)}`,
      `Please pay to ${r.iban} with the reference ${r.ogm ?? r.number}`,
      "",
      "Kind regards,",
      r.signer,
      r.company,
    ].join("\n"),
  };
}

/** Over the limit when what the customer could owe (open + still to invoice) passes it. */
export function creditProblem(limitCents: number | null, exposureCents: number): string | null {
  if (!limitCents || limitCents <= 0 || exposureCents <= limitCents) return null;
  return `Over the credit limit: ${formatCents(exposureCents)} owed or to invoice, limit ${formatCents(limitCents)}.`;
}
