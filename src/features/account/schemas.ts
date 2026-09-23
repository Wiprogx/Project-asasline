import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/domain/people";

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`)
      .max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "The two new passwords differ",
  })
  .refine((v) => v.next !== v.current, {
    path: ["next"],
    message: "Choose a password you have not used here",
  });
