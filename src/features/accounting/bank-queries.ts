import "server-only";
import { isNull } from "drizzle-orm";
import { standingOf, type Standing, type BankAccount } from "@/domain/bank-accounts";
import { trialBalance } from "@/domain/ledger-reports";
import { requirePermission } from "@/server/auth/dal";
import { readBankAccounts } from "@/server/bank-config";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bankLines } from "@/server/db/schema";
import { readJournal } from "./ledger-queries";

/** Where each of the office's accounts stands: the statements against the books (legacy vBank). */
export async function bankStandings(): Promise<{ account: BankAccount; standing: Standing }[]> {
  await requirePermission("app.accounting");
  const accounts = await readBankAccounts();
  if (accounts.length === 0) return [];
  const [lines, entries] = await Promise.all([
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
  ]);
  const today = officeToday();
  const totals = trialBalance(entries, today, today);
  return accounts.map((account) => ({
    account,
    standing: standingOf(
      account,
      lines,
      totals.find((t) => t.account === account.account)?.closeCents ?? 0,
    ),
  }));
}
