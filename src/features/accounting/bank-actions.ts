"use server";

import { and, eq, isNull } from "drizzle-orm";
import { dedupKey, parseStatement } from "@/domain/bank";
import { certainMatch, proposals } from "@/domain/matching";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { readBankAccounts } from "@/server/bank-config";
import { bankLines, bankStatements } from "@/server/db/schema";
import { guarded, Refused } from "./invoice-store";
import { openInvoices } from "./money";
import { bookPayment, bookRuleCharge, refreshMoney } from "./payment-store";
import { contactOfIbanLookup } from "./queries";
import { bookChargeSchema, ignoreLineSchema, matchLineSchema } from "./schemas";
import { ruleFor } from "@/domain/bank-rules";
import { readBankRules } from "@/server/bank-rules-config";
import { formatCents } from "@/domain/money";
import { bankStandings } from "./bank-queries";

const MAX_FILE = 5 * 1024 * 1024;

/** Imports a CODA or CSV statement. Lines already imported (an overlapping export) are skipped. */
export async function importStatement(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a CODA or CSV file.");
  if (file.size > MAX_FILE)
    return fail("That file is larger than a bank statement should be (5 MB).");
  const statement = parseStatement(await file.text());
  if (!statement) return fail(`Nothing in ${file.name} reads as a bank statement (CODA or CSV).`);

  // A file that names no account is the office's only one, when it has only one.
  const accounts = await readBankAccounts();
  const account = statement.account || (accounts.length === 1 ? accounts[0].iban : "");
  const rows = statement.moves.map((m, i) => ({
    dedupKey: dedupKey(statement.account, m, i),
    source: statement.source,
    account: account || null,
    date: m.date,
    amountCents: m.amountCents,
    name: m.name || null,
    iban: m.iban || null,
    comm: m.comm || null,
    ogm: m.ogm || null,
    createdBy: user.id,
  }));
  const added = await db
    .insert(bankLines)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: bankLines.id });
  // The statement says what the balance is: kept, and if ours differs a statement is missing.
  if (statement.closingCents !== null && account)
    await db.insert(bankStatements).values({
      account,
      source: statement.source,
      file: file.name,
      closingDate: statement.closingDate,
      closingCents: statement.closingCents,
      createdBy: user.id,
    });
  await audit(db, {
    action: "bank.import",
    userId: user.id,
    detail: {
      file: file.name,
      source: statement.source,
      added: added.length,
      skipped: rows.length - added.length,
      closingCents: statement.closingCents,
    },
  });
  refreshMoney();
  const gap =
    statement.closingCents !== null && account
      ? ((await bankStandings()).find((x) => x.account.iban === account)?.standing.gapCents ?? 0)
      : 0;
  const differs = gap
    ? ` · ⚠ the balance differs by ${formatCents(gap)} — a statement is missing`
    : "";
  const skipped = rows.length - added.length;
  return {
    ok: true,
    data: undefined,
    message: `${added.length} line${added.length === 1 ? "" : "s"} imported${skipped ? ` · ${skipped} already there` : ""}${differs}`,
  };
}

/** A person confirms which invoice a line pays. Never more than is open (bookPayment checks). */
export async function matchLine(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const parsed = matchLineSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [line] = await tx
        .select()
        .from(bankLines)
        .where(eq(bankLines.id, parsed.data.lineId))
        .for("update");
      if (!line || line.state !== "open")
        throw new Refused("This line is already matched or ignored.");
      return bookPayment(tx, {
        invoiceId: parsed.data.invoiceId,
        amountCents: Math.abs(line.amountCents),
        date: line.date,
        method: "bank",
        reference: line.ogm ?? line.comm,
        writeOff: null,
        bankLineId: line.id,
        userId: user.id,
      });
    }),
  );
  if (!r.ok) return r;
  refreshMoney(parsed.data.invoiceId, r.value.bookingId);
  return { ok: true, data: undefined, message: `Matched to ${r.value.invoiceNumber}` };
}

/**
 * A line the office's own rules know (the bank's fee, the VAT to the state) pays no invoice:
 * it is booked straight to the rule's account, as a payment with no partner, and the line is
 * matched to it (legacy rule proposals).
 */
export async function bookCharge(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const parsed = bookChargeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [line] = await tx
        .select()
        .from(bankLines)
        .where(eq(bankLines.id, parsed.data.lineId))
        .for("update");
      if (!line || line.state !== "open")
        throw new Refused("This line is already matched or ignored.");
      const rule = ruleFor(await readBankRules(), `${line.comm ?? ""} ${line.name ?? ""}`);
      if (!rule) throw new Refused("No rule of the office reads this line.");
      return bookRuleCharge(tx, line, rule, user.id);
    }),
  );
  if (!r.ok) return r;
  refreshMoney();
  return { ok: true, data: undefined, message: `Booked as ${r.value.label} — ${r.value.account}` };
}

export async function ignoreLine(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const parsed = ignoreLineSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const rows = await db
    .update(bankLines)
    .set({ state: "ignored", note: parsed.data.reason, updatedBy: user.id, updatedAt: new Date() })
    .where(and(eq(bankLines.id, parsed.data.lineId), eq(bankLines.state, "open")))
    .returning({ id: bankLines.id });
  if (rows.length === 0) return fail("This line is already matched or ignored.");
  refreshMoney();
  return { ok: true, data: undefined, message: "Line set aside" };
}

/**
 * The lines nobody has to look at: each certain proposal is booked, one transaction per line,
 * so a line that fails (someone paid that invoice meanwhile) leaves the others booked.
 */
export async function autoMatch(): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const lines = await db
    .select()
    .from(bankLines)
    .where(and(eq(bankLines.state, "open"), isNull(bankLines.archivedAt)));
  const ibanOf = await contactOfIbanLookup();
  // Read once, not once per line: a booked line reduces what its invoice still has open here,
  // and bookPayment re-checks the ledger under its own lock anyway.
  let open = await openInvoices(db);
  let matched = 0;
  for (const line of lines) {
    const best = certainMatch(
      line.amountCents,
      proposals(
        {
          ...line,
          comm: line.comm ?? "",
          ogm: line.ogm ?? "",
          name: line.name ?? "",
          iban: line.iban ?? "",
        },
        open,
        ibanOf,
      ),
      open,
    );
    if (!best) continue;
    const r = await guarded(() =>
      db.transaction((tx) =>
        bookPayment(tx, {
          invoiceId: best.invoiceId,
          amountCents: Math.abs(line.amountCents),
          date: line.date,
          method: "bank",
          reference: line.ogm ?? line.comm,
          writeOff: null,
          bankLineId: line.id,
          userId: user.id,
        }),
      ),
    );
    if (!r.ok) continue;
    matched++;
    const paid = Math.abs(line.amountCents);
    open = open
      .map((o) => (o.id === best.invoiceId ? { ...o, openCents: o.openCents - paid } : o))
      .filter((o) => o.openCents > 0);
  }
  await audit(db, {
    action: "bank.automatch",
    userId: user.id,
    detail: { matched, left: lines.length - matched },
  });
  refreshMoney();
  const left = lines.length - matched;
  return {
    ok: true,
    data: undefined,
    message: `${matched} matched${left ? ` · ${left} left for you` : " — nothing left"}`,
  };
}
