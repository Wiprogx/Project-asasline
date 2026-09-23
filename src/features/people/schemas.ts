import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/domain/people";
import { ROLES } from "@/domain/permissions";

export const newPersonSchema = z.object({
  name: z.string().min(2, "Full name").max(120),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  role: z.enum(ROLES),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `At least ${MIN_PASSWORD_LENGTH} characters — give it by phone, not email`,
    ),
});

export const roleChangeSchema = z.object({ id: z.uuid(), role: z.enum(ROLES) });

export const activeChangeSchema = z.object({
  id: z.uuid(),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});
