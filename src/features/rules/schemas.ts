import { z } from "zod";

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

/** The rule editor's form, shaped into a rule; the rule book's own schema checks it again. */
export const ruleFormSchema = z.object({
  index: z.union([z.literal("new"), z.coerce.number().int().min(0)]),
  version: z.coerce.number().int().min(0),
  code: z.string().transform((s) => s.trim().toUpperCase()),
  step: z.string().min(2, "What the person does").max(200),
  doc: z.string().min(2, "The paper it produces").max(120),
  country: z
    .string()
    .default("*")
    .transform((s) => s.trim().toUpperCase() || "*"),
  pol: z
    .string()
    .default("*")
    .transform((s) => s.trim().toUpperCase() || "*"),
  kind: z.enum(["export", "import", "*"]),
  party: z.string(),
  role: z.string(),
  anchor: z.string(),
  offset: z.coerce.number().int("Whole days").min(-60).max(60),
  workingDays: checkbox,
  blocking: checkbox,
  active: checkbox,
  needs: z
    .string()
    .optional()
    .transform((s) =>
      (s ?? "")
        .split(/[,\s]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  note: z.string().max(500).optional(),
});

export const toggleRuleSchema = z.object({
  index: z.coerce.number().int().min(0),
  version: z.coerce.number().int().min(0),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const addHolidaySchema = z.object({
  version: z.coerce.number().int().min(0),
  country: z.string().transform((s) => s.trim().toUpperCase()),
  date: z.string(),
  name: z.string().min(2).max(80),
});

export const removeHolidaySchema = z.object({
  version: z.coerce.number().int().min(0),
  index: z.coerce.number().int().min(0),
});
