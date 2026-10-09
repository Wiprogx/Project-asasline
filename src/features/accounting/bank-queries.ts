import "server-only";
import { desc, isNull } from "drizzle-orm";
import { type BankAccount, type BankWord, type Standing, standingOf } from "@/domain/bank-accounts";
import { trialBalance } from "@/domain/ledger-reports";
import { requirePermission } from "@/server/auth/dal";
import { readBankAccounts } from "@/server/bank-config";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bankLines, bankStatements } from "@/server/db/schema";
import { readJournal } from "./ledger-queries";

/** Where each of the office's accounts stands: the statements against the books (legacy vBank). */
export async function bankStandings(): Promise<{ account: BankAccount; standing: Standing }[]> {
  await requirePermission("app.accounting");
  const accounts = await readBankAccounts();
  if (accounts.length === 0) return [];
  const [lines, entries, words] = await Promise.all([
    db
      .select({
        account: bankLines.account,
        date: bankLines.date,
        amountCents: bankLines.amountCents,
        state: bankLines.state,
      })
      .from(bankLines)
      .where(isNull(bankLines.archivedAt)),
    readJournal(),
    db
      .select({
        account: bankStatements.account,
        closingCents: bankStatements.closingCents,
        closingDate: bankStatements.closingDate,
      })
      .from(bankStatements)
      .orderBy(desc(bankStatements.closingDate), desc(bankStatements.createdAt)),
  ]);
  // The bank's latest word per account.
  const said = new Map<string, BankWord>();
  for (const w of words) if (!said.has(w.account)) said.set(w.account, w);
  const today = officeToday();
  const totals = trialBalance(entries, today, today);
  return accounts.map((account) => ({
    account,
    standing: standingOf(
      account,
      lines,
      totals.find((t) => t.account === account.account)?.closeCents ?? 0,
      said.get(account.iban) ?? null,
    ),
  }));
}
