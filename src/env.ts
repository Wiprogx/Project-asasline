import { z } from "zod";

/**
 * The one place that reads process.env. Parsed at boot, so a missing variable fails on
 * start, on the developer's screen, instead of at the line that needs it in production.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().optional(),
  APP_TIMEZONE: z.string().default("Europe/Brussels"),
  SESSION_HOURS: z.coerce.number().int().positive().default(12),
  /** Where the office's files are stored (one folder per booking); relative to the working dir. */
  FILES_DIR: z.string().min(1).default("var/files"),
  /** Real sending: unset, an outgoing mail is recorded and opened in the mail app instead. */
  SMTP_URL: z.url().optional(),
  MAIL_FROM: z.string().min(3).optional(),
  /** WhatsApp Business (Cloud API): unset, WhatsApp opens in the app instead. */
  WHATSAPP_TOKEN: z.string().min(10).optional(),
  WHATSAPP_PHONE_ID: z.string().min(3).optional(),
});

export const env = schema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || undefined,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
  SESSION_HOURS: process.env.SESSION_HOURS,
  FILES_DIR: process.env.FILES_DIR || undefined,
  SMTP_URL: process.env.SMTP_URL || undefined,
  MAIL_FROM: process.env.MAIL_FROM || undefined,
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || undefined,
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID || undefined,
});
