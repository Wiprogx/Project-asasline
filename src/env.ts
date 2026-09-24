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
});

export const env = schema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || undefined,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
  SESSION_HOURS: process.env.SESSION_HOURS,
  FILES_DIR: process.env.FILES_DIR || undefined,
});
