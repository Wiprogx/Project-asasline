import { z } from "zod";
import { parseYmd } from "@/domain/dates";
import { toCents } from "@/domain/money";

/** A day typed as "YYYY-MM-DD" and real on the calendar (invariant 4: never a Date, never 2026-02-30). */
export const dayField = (message = "Date as YYYY-MM-DD") =>
  z.string().refine((s) => parseYmd(s) !== null, message);

/** The same, optional: absent or empty is null. */
export const optionalDayField = (message = "A date") =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (parseYmd(v) === null) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return v;
    });

/** Euros typed as "1250" or "1250.00", kept as integer cents (invariant 3); refused below zero unless allowed. */
export const centsField = (label: string, opts: { allowNegative?: boolean } = {}) =>
  z.string({ error: `${label}: an amount` }).transform((v, ctx) => {
    const c = toCents(v);
    if (c === null || (!opts.allowNegative && c < 0)) {
      ctx.addIssue({ code: "custom", message: `${label}: an amount like 1250 or 1250.00` });
      return 0;
    }
    return c;
  });
