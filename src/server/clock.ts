import { env } from "@/env";

/**
 * The only place the app reads the wall clock. Everything downstream works on the
 * "YYYY-MM-DD" day string this returns, in the office's zone (Europe/Brussels), so a
 * server in another region never books a shipment on the wrong day.
 */
export function officeToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
