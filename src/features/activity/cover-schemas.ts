import { z } from "zod";
import { dayField } from "@/lib/zod-fields";

/** Somebody away and who covers them, for which days (the end is open until known). */
export const coverSchema = z.object({
  absentId: z.uuid("Who is away"),
  coverId: z.uuid("Who covers"),
  from: dayField("A date"),
  to: dayField("A date").optional(),
});

/** A hand-over for good: every open task of a person or a role moves to someone, once. */
export const coverHandOverSchema = z.object({
  from: z.string().min(1, "From whom"),
  toId: z.uuid("To whom"),
});
