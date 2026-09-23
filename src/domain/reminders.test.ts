import { describe, expect, it } from "vitest";
import { creditProblem, reminderText, REMIND_STEPS, remindStep } from "./reminders";

const base = { dueDate: "2026-05-01", openCents: 10_000, today: "2026-05-02", last: null };

describe("remindStep", () => {
  it("is nothing before the due date is past, or when nothing is open", () => {
    expect(remindStep({ ...base, today: "2026-05-01" })).toBeNull();
    expect(remindStep({ ...base, openCents: 0 })).toBeNull();
    expect(remindStep({ ...base, dueDate: null })).toBeNull();
  });

  it("starts with the friendly reminder the day after the due date", () => {
    expect(remindStep(base)?.level).toBe(1);
  });

  it("goes to the next step only once late enough for it", () => {
    const last = { level: 1, sentOn: "2026-05-02" };
    expect(remindStep({ ...base, today: "2026-05-14", last })).toBeNull();
    expect(remindStep({ ...base, today: "2026-05-16", last })?.level).toBe(2);
  });

  it("never reminds twice within ten days", () => {
    const last = { level: 1, sentOn: "2026-06-01" };
    expect(remindStep({ ...base, today: "2026-06-05", last })).toBeNull();
    expect(remindStep({ ...base, today: "2026-06-11", last })?.level).toBe(2); // one step at a time
  });

  it("stops after the last notice", () => {
    const last = { level: 3, sentOn: "2026-06-01" };
    expect(remindStep({ ...base, today: "2026-09-01", last })).toBeNull();
  });
});

describe("reminderText", () => {
  it("names the step, the invoice, what is open and how to pay", () => {
    const t = reminderText({
      step: REMIND_STEPS[2],
      customer: "Acme",
      number: "INV/2026/00007",
      issueDate: "2026-04-01",
      dueDate: "2026-05-01",
      openCents: 125_000,
      iban: "BE41 0689 4162 5810",
      ogm: "+++090/9337/55493+++",
      signer: "Ana",
      company: "ASASLINE S.A.",
    });
    expect(t.subject).toBe("Last notice — invoice INV/2026/00007");
    expect(t.body).toContain("within 8 days");
    expect(t.body).toContain("Still open: €1,250.00");
    expect(t.body).toContain("with the reference +++090/9337/55493+++");
  });
});

describe("creditProblem", () => {
  it("is nothing without a limit or at the limit", () => {
    expect(creditProblem(null, 10)).toBeNull();
    expect(creditProblem(1_000, 1_000)).toBeNull();
  });

  it("warns above the limit with both figures", () => {
    expect(creditProblem(100_000, 150_000)).toBe(
      "Over the credit limit: €1,500.00 owed or to invoice, limit €1,000.00.",
    );
  });
});
