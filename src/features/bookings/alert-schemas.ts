import { z } from "zod";
import { ALERT_LEVELS } from "@/domain/alerts";

/** An alert raised on a booking: how serious, and what it says. */
export const raiseAlertSchema = z.object({
  bookingId: z.uuid(),
  level: z.enum(ALERT_LEVELS).default("alert"),
  text: z.string().trim().min(2, "Say what the alert is").max(300),
});

export const resolveAlertSchema = z.object({ bookingId: z.uuid(), alertId: z.uuid() });
