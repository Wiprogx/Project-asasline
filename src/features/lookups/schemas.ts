import { z } from "zod";
import { LOOKUP_KINDS, type LookupKind } from "@/domain/lookup-tables";
import { LOOKUP_META, type LookupColumn } from "./meta";

const ref = {
  kind: z.enum(LOOKUP_KINDS),
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
};

export const kindSchema = z.enum(LOOKUP_KINDS);

/** A whole number typed in a field; empty is "not given". */
const wholeNumber = (min: number, max: number, required: boolean | undefined) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) {
        if (required) ctx.addIssue({ code: "custom", message: "Needed" });
        return null;
      }
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max)
        ctx.addIssue({ code: "custom", message: `A whole number from ${min} to ${max}` });
      return n;
    });

/** How one of the list's own columns is read from the form (a checkbox posts "on"). */
function columnSchema(c: LookupColumn): z.ZodType {
  switch (c.type) {
    case "bool":
      return z
        .string()
        .optional()
        .transform((v) => v === "on");
    case "int":
      return wholeNumber(c.min, c.max, c.required);
    case "text":
      return c.required
        ? z.string().trim().min(1, "Needed").max(c.max)
        : z
            .string()
            .trim()
            .max(c.max)
            .optional()
            .transform((v) => v ?? null);
    case "select":
      return z
        .uuid()
        .optional()
        .transform((v) => v ?? null);
  }
}

/** The words offered — spelled as the list's code when it is one of codes. */
const labelSchema = (kind: LookupKind) => {
  const code = LOOKUP_META[kind].code;
  const words = z.string().trim().min(2, "Name the reason").max(200);
  return code
    ? words.transform((v) => v.toUpperCase()).refine((v) => code.pattern.test(v), code.message)
    : words;
};

const position = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 100_000)
      ctx.addIssue({ code: "custom", message: "A whole number, e.g. 10" });
    return n;
  });

/** The words, their place in the list (empty: at the end) and the list's own columns, by key. */
const fieldsOf = (kind: LookupKind) => ({
  label: labelSchema(kind),
  position,
  ...Object.fromEntries((LOOKUP_META[kind].columns ?? []).map((c) => [c.key, columnSchema(c)])),
});

export const createLookupSchema = (kind: LookupKind) =>
  z.object({ kind: z.literal(kind), ...fieldsOf(kind) });

export const updateLookupSchema = (kind: LookupKind) =>
  z.object({ ...ref, kind: z.literal(kind), ...fieldsOf(kind) });

/** The values of the list's own columns, out of a parsed form. */
export function columnValues(kind: LookupKind, data: Record<string, unknown>) {
  const keys = (LOOKUP_META[kind].columns ?? []).map((c) => c.key);
  return Object.fromEntries(keys.map((k) => [k, data[k] ?? null]));
}

export const archiveLookupSchema = z.object({
  ...ref,
  reason: z.string().trim().min(3, "Say why — it stays on the record").max(500),
});

export const restoreLookupSchema = z.object(ref);
