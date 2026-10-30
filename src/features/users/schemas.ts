import { z } from "zod";
import { LANGUAGES } from "@/domain/contacts";
import { MIN_PASSWORD_LENGTH } from "@/domain/users";
import { ROLES } from "@/domain/permissions";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** Who the user is at the office: what a colleague, a letter and the routing read. */
const userFields = z.object({
  name: z.string().trim().min(2, "Full name").max(120),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  role: z.enum(ROLES),
  jobTitle: optional(120),
  signature: optional(2000),
  lang: z.enum(LANGUAGES).default("en"),
});

/**
 * A password an Admin sets is always temporary: the person chooses their own at the first
 * sign-in. Left empty, one is made up and shown once.
 */
const temporary = z
  .string()
  .optional()
  .refine((v) => !v || v.length >= MIN_PASSWORD_LENGTH, {
    message: `At least ${MIN_PASSWORD_LENGTH} characters — or leave it empty to make one up`,
  });

export const newUserSchema = userFields.extend({ password: temporary });

export const editUserSchema = userFields.extend({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

export const tempPasswordSchema = z.object({ id: z.uuid(), password: temporary });

export const resetLinkSchema = z.object({ id: z.uuid() });

export const switchOffSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(3, "Say why — it stays on the record").max(300),
});

export const switchOnSchema = z.object({ id: z.uuid() });
