import { z } from "zod";
import { parseYmd } from "@/domain/dates";
import { toCents } from "@/domain/money";
import { type TableViewSpec, WIDTH_MAX, WIDTH_MIN } from "@/domain/table-prefs";

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

/** How a person reads a list: the columns ticked and/or the widths dragged (domain/table-prefs). */
export const tableViewSchema = <K extends string>(spec: TableViewSpec<K>) =>
  z.object({
    columns: z.array(z.enum(spec.all.map((c) => c.key) as [K, ...K[]])).optional(),
    widths: z.record(z.string().max(40), z.number().min(WIDTH_MIN).max(WIDTH_MAX)).optional(),
  });
