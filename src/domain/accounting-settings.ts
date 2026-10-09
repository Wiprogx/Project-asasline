import { DEFAULT_PAYMENT_TERMS } from "./accounting";
import { DEFAULT_FX, type FxRates } from "./fx";

/**
 * The accounting settings the office edits (legacy BOOKS.approveOver, BOOKS.vatPeriod,
 * PAYMENT_TERMS, INVOICE_SEQ): the `books` table carries the close day and these two
 * figures; the payment terms are their own table; the numbering is the sequences table.
 */
export const VAT_PERIODS = ["monthly", "quarterly"] as const;
export type VatPeriodMode = (typeof VAT_PERIODS)[number];

export type BooksSettings = {
  closedThrough: string | null;
  /** A bill at or above this gross amount needs a second person before it is paid. */
  approveOverCents: number;
  vatPeriod: VatPeriodMode;
  /** Alongside Odoo until this day, or null (legacy BOOKS.parallelUntil). */
  parallelUntil: string | null;
  /** Euro for one unit, in ten-thousandths (legacy BOOKS.fx): what a new USD or GBP document starts from. */
  fx: FxRates;
};

export const DEFAULT_BOOKS: BooksSettings = {
  closedThrough: null,
  approveOverCents: 500_000,
  vatPeriod: "quarterly",
  parallelUntil: null,
  fx: { ...DEFAULT_FX },
};

/** The office runs alongside Odoo until that day (legacy BOOKS.parallelUntil): every sale is issued there too. */
export const parallelRun = (books: { parallelUntil: string | null }, today: string) =>
  !!books.parallelUntil && today <= books.parallelUntil;

export const TERM_RULES = ["days", "docs", "before_confirm", "before_arrival"] as const;
export type TermRule = (typeof TERM_RULES)[number];

export type PaymentTerm = { id: string; name: string; rule: TermRule; days?: number };

export const DEFAULT_TERMS: PaymentTerm[] = DEFAULT_PAYMENT_TERMS.map((t) => ({ ...t }));

/** `id | Name | rule | days` — the days only for the "days" rule. */
export const paymentTermLines = (terms: readonly PaymentTerm[]) =>
  terms
    .map((t) =>
      [t.id, t.name, t.rule, t.rule === "days" ? String(t.days ?? 0) : ""]
        .join(" | ")
        .replace(/(\s\|\s*)+$/, ""),
    )
    .join("\n");

export function parsePaymentTermLines(text: string): { terms: PaymentTerm[]; problems: string[] } {
  const terms: PaymentTerm[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [id = "", name = "", rule = "days", days = ""] = line.split("|").map((x) => x.trim());
      const n = days === "" ? 0 : Number(days);
      if (!/^[a-z][a-z0-9_]{0,30}$/.test(id))
        problems.push(`Line ${i + 1}: an id in lowercase (d30).`);
      else if (!name || name.length > 80)
        problems.push(`Line ${i + 1}: a name (up to 80 characters).`);
      else if (!(TERM_RULES as readonly string[]).includes(rule))
        problems.push(`Line ${i + 1}: a rule among ${TERM_RULES.join(", ")}.`);
      else if (rule === "days" && (!Number.isInteger(n) || n < 0 || n > 365))
        problems.push(`Line ${i + 1}: the days as a whole number, 0 to 365.`);
      else if (terms.some((t) => t.id === id)) problems.push(`Line ${i + 1}: ${id} twice.`);
      else
        terms.push(
          rule === "days" ? { id, name, rule, days: n } : { id, name, rule: rule as TermRule },
        );
    });
  return { terms, problems };
}

/** The counters as the office reads them: "QT · October 2026" or "Invoices · 2026", with the next number. */
export function sequenceLabel(key: string): string {
  const inv = key.match(/^(INV|CN|BILL):?(\d{4})$/i);
  if (inv) {
    const kind =
      { INV: "Invoices", CN: "Credit notes", BILL: "Bills" }[inv[1].toUpperCase()] ?? inv[1];
    return `${kind} · ${inv[2]}`;
  }
  const ref = key.match(/^(QT|SB)(\d{2})(\d{2})$/);
  if (ref) return `${ref[1] === "QT" ? "Quotations" : "Bookings"} · 20${ref[2]}-${ref[3]}`;
  return key;
}
