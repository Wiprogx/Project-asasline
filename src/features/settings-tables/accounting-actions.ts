"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parsePaymentTermLines } from "@/domain/accounting-settings";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { PAYMENT_TERMS_TAG, paymentTermsSchema } from "@/server/accounting-config";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { BOOKS_NAME, BOOKS_TAG, booksSchema, readBooksNow } from "@/server/books-config";
import { db } from "@/server/db/client";
import { sequences } from "@/server/db/schema";
import { ConflictError } from "@/server/versioned";
import { booksSettingsSchema, raiseSequenceSchema } from "./schemas";
import { saveTable, versioned } from "./table-store";
import { parseBankAccountLines } from "@/domain/bank-accounts";
import { BANK_ACCOUNTS_TAG, bankAccountsSchema } from "@/server/bank-config";
import { parseBankRuleLines } from "@/domain/bank-rules";
import { BANK_RULES_TAG, bankRulesSchema } from "@/server/bank-rules-config";

/** Payment terms, one per line as "id | Name | rule | days". */
export async function savePaymentTerms(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { terms, problems } = parsePaymentTermLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = paymentTermsSchema.safeParse(terms);
  if (!checked.success) return fail("At least one term, forty at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "paymentTerms",
    value: checked.data,
    version: parsed.data.version,
    tag: PAYMENT_TERMS_TAG,
    path: "/settings/accounting",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} payment terms` }
  );
}

/** The books' two figures; the close day on the row is kept as it is. */
export async function saveBooksSettings(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = booksSettingsSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const current = await readBooksNow(db);
  const value = booksSchema.parse({
    ...current,
    approveOverCents: parsed.data.approveOver,
    vatPeriod: parsed.data.vatPeriod,
    parallelUntil: parsed.data.parallelUntil,
    fx: { USD: parsed.data.fxUsd, GBP: parsed.data.fxGbp },
  });
  const bad = await saveTable({
    userId: user.id,
    name: BOOKS_NAME,
    value,
    version: parsed.data.version,
    tag: BOOKS_TAG,
    path: "/settings/accounting",
    detail: {
      approveOverCents: value.approveOverCents,
      vatPeriod: value.vatPeriod,
      parallelUntil: value.parallelUntil,
      fx: value.fx,
    },
  });
  return bad ?? { ok: true, data: undefined, message: "Books saved" };
}

/** A counter moved forward so a series continues where the previous system stopped; never back. */
export async function raiseSequence(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = raiseSequenceSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { key, value } = parsed.data;
  const moved = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(sequences).where(eq(sequences.key, key)).for("update");
    if (!row) throw new ConflictError("This series");
    if (row.value >= value) return null;
    await tx.update(sequences).set({ value }).where(eq(sequences.key, key));
    await audit(tx, {
      action: "sequence.raise",
      userId: user.id,
      entity: "sequence",
      entityId: key,
      detail: { from: row.value, to: value },
    });
    return row.value;
  });
  revalidatePath("/settings/accounting");
  if (moved === null) return fail(`A counter never moves back: ${key} is already past ${value}.`);
  return { ok: true, data: undefined, message: `${key} moved forward from ${moved} to ${value}` };
}

/** The office's bank accounts, one per line as "Name | IBAN | BIC | 550000 | opening | YYYY-MM-DD". */
export async function saveBankAccounts(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(10_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { accounts, problems } = parseBankAccountLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = bankAccountsSchema.safeParse(accounts);
  if (!checked.success) return fail("Twenty accounts at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "bankAccounts",
    value: checked.data,
    version: parsed.data.version,
    tag: BANK_ACCOUNTS_TAG,
    path: "/settings/accounting",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} bank accounts` }
  );
}

/** The bank matching rules, one per line as "words|more words | 657000 | Bank charges". */
export async function saveBankRules(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { rules, problems } = parseBankRuleLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = bankRulesSchema.safeParse(rules);
  if (!checked.success) return fail("Fifty rules at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "bankRules",
    value: checked.data,
    version: parsed.data.version,
    tag: BANK_RULES_TAG,
    path: "/settings/accounting",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} bank rules` };
}
