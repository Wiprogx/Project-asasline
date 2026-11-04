import "server-only";
import type { IdKind } from "@/domain/contacts";
import { type RegisterAnswer, registerOf } from "@/domain/registers";
import { officeToday } from "@/server/clock";
import { lookupRegister } from "@/server/registers";
import { CHECKED, type ContactInput } from "./schemas";

type Refusal = { ok: false; error: string; fieldErrors: Record<string, string[]> };

/** What the register said of a number, kept on the audit line. */
export type Found = { register: string; name: string | null; address: string | null };

export type RegisterOutcome = {
  /** The check-day columns to write: today for a number the register knows, null for one it could not judge. */
  stamps: Partial<Record<"vatCheckedOn" | "eoriCheckedOn", string | null>>;
  found: Partial<Record<IdKind, Found>>;
  /** What to tell the person beside "Saved": a register that did not answer. */
  notes: string[];
};

export const labelOf = (kind: IdKind) => (kind === "vat" ? "VAT number" : "EORI number");
const columnOf = (kind: IdKind): "vatCheckedOn" | "eoriCheckedOn" =>
  kind === "vat" ? "vatCheckedOn" : "eoriCheckedOn";

/** The register's verdict as words for the person. */
export function verdictWords(kind: IdKind, register: string, a: RegisterAnswer): string {
  const label = labelOf(kind);
  if (a.state === "valid") return `${label} valid at ${register}${a.name ? ` — ${a.name}` : ""}`;
  if (a.state === "invalid")
    return `${register} does not know this ${label} — check it with the customer`;
  return `${register} is not answering (${a.detail}) — the ${label} is left unchecked`;
}

/**
 * On save, a number that is new or changed is asked of its register (legacy "Verify", now
 * part of the save): known, the contact carries today as its check day; unknown, the save is
 * refused with the register's word; the register silent, the number is saved unchecked and
 * the person told. A number no register is online for is saved unchecked, as before.
 */
export async function registerChecks(
  c: ContactInput,
  changed: (kind: IdKind) => boolean,
): Promise<Refusal | RegisterOutcome> {
  const out: RegisterOutcome = { stamps: {}, found: {}, notes: [] };
  const fieldErrors: Record<string, string[]> = {};
  const kinds = CHECKED[c.type].filter((k) => changed(k));
  const answers = await Promise.all(
    kinds.map(async (kind) => {
      const value = c[kind];
      return { kind, value, answer: value ? await lookupRegister(kind, c.country, value) : null };
    }),
  );
  for (const { kind, value, answer } of answers) {
    out.stamps[columnOf(kind)] = null;
    const register = registerOf(c.country, kind);
    if (!value || !register || !answer) continue;
    if (answer.state === "valid") {
      out.stamps[columnOf(kind)] = officeToday();
      out.found[kind] = { register: register.name, name: answer.name, address: answer.address };
    } else if (answer.state === "invalid") {
      fieldErrors[kind] = [verdictWords(kind, register.name, answer)];
    } else out.notes.push(verdictWords(kind, register.name, answer));
  }
  if (Object.keys(fieldErrors).length)
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors };
  return out;
}

export const isRefusal = (r: Refusal | RegisterOutcome): r is Refusal => "ok" in r;
