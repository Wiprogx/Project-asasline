import { ibanOk } from "./iban";
import { centsToInput, toCents } from "./money";

/**
 * The office's bank accounts (legacy BANK_ACCOUNTS): a Settings table — the IBAN the
 * statements come from, the ledger account the money sits on, and the balance on the day
 * the books started. Integer cents (invariant 3), days as strings (invariant 4).
 */
export type BankAccount = {
  name: string;
  iban: string;
  bic: string | null;
  /** The ledger account, 55… (legacy acct). */
  account: string;
  openingCents: number;
  openingDate: string;
};

export const ibanClean = (v: string | null | undefined) =>
  (v ?? "").replace(/\s+/g, "").toUpperCase();
export const ibanPretty = (v: string) =>
  ibanClean(v)
    .replace(/(.{4})/g, "$1 ")
    .trim();

/** "Belfius current | BE68539007547034 | GKCCBEBB | 550000 | 1250.00 | 2026-01-01" */
export const bankAccountLines = (list: readonly BankAccount[]) =>
  list
    .map((a) =>
      [a.name, a.iban, a.bic ?? "", a.account, centsToInput(a.openingCents), a.openingDate].join(
        " | ",
      ),
    )
    .join("\n");

export function parseBankAccountLines(text: string): {
  accounts: BankAccount[];
  problems: string[];
} {
  const accounts: BankAccount[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [name = "", iban = "", bic = "", account = "", opening = "0", date = ""] = line
        .split("|")
        .map((x) => x.trim());
      const ib = ibanClean(iban);
      const cents = toCents(opening);
      if (!name || name.length > 80) problems.push(`Line ${i + 1}: a name (Belfius current).`);
      else if (!ibanOk(ib)) problems.push(`Line ${i + 1}: that IBAN does not check out.`);
      else if (bic && !/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/.test(bic))
        problems.push(`Line ${i + 1}: a BIC is 8 or 11 letters and digits.`);
      else if (!/^5[5-8]\d{4}$/.test(account))
        problems.push(`Line ${i + 1}: a bank account is booked on a 55… account.`);
      else if (cents === null) problems.push(`Line ${i + 1}: the opening balance like 1250.00.`);
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        problems.push(`Line ${i + 1}: the day the books started, as YYYY-MM-DD.`);
      else if (accounts.some((a) => a.iban === ib)) problems.push(`Line ${i + 1}: ${ib} twice.`);
      else
        accounts.push({
          name,
          iban: ib,
          bic: bic ? bic.toUpperCase() : null,
          account,
          openingCents: cents,
          openingDate: date,
        });
    });
  return { accounts, problems };
}

export type StatementLine = {
  account: string | null;
  date: string;
  amountCents: number;
  state: "open" | "matched" | "ignored";
};

export type Standing = {
  /** The opening balance plus every statement line since (legacy stmtBalance). */
  statementCents: number;
  /** The ledger account's close (legacy "balance in the books"). */
  booksCents: number;
  openCount: number;
  openCents: number;
};

/** Where one account stands: the two balances meet once every line is reconciled. */
export function standingOf(
  a: BankAccount,
  lines: readonly StatementLine[],
  booksCents: number,
): Standing {
  const mine = lines.filter((l) => ibanClean(l.account) === a.iban && l.date >= a.openingDate);
  const open = mine.filter((l) => l.state === "open");
  return {
    statementCents: a.openingCents + mine.reduce((s, l) => s + l.amountCents, 0),
    booksCents,
    openCount: open.length,
    openCents: open.reduce((s, l) => s + l.amountCents, 0),
  };
}
