import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/domain/users";

export const loginSchema = z.object({
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

const newPassword = z
  .object({
    next: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`)
      .max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "The two passwords differ",
  });

/** Choosing one's own password after a temporary one. */
export const ownPasswordSchema = newPassword;

/** "Forgot password?": only the email. */
export const forgotSchema = z.object({
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
});

/** A new password through a one-time link. */
export const resetSchema = newPassword.and(z.object({ token: z.string().min(20).max(100) }));
