import { z } from "zod";
import { LOOKUP_KINDS } from "@/domain/lookup-tables";

const ref = {
  kind: z.enum(LOOKUP_KINDS),
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
};

/** The words offered, and where they come in the list (empty: at the end). */
const fields = {
  /** The list's yes/no column, when it has one (a checkbox posts "on"). */
  flag: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  label: z.string().trim().min(2, "Name the reason").max(200),
  position: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 100_000)
        ctx.addIssue({ code: "custom", message: "A whole number, e.g. 10" });
      return n;
    }),
};

export const createLookupSchema = z.object({ kind: z.enum(LOOKUP_KINDS), ...fields });

export const updateLookupSchema = z.object({ ...ref, ...fields });

export const archiveLookupSchema = z.object({
  ...ref,
  reason: z.string().trim().min(3, "Say why — it stays on the record").max(500),
});

export const restoreLookupSchema = z.object(ref);
