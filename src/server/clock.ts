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

/** The office's local date and time, "YYYY-MM-DDTHH:mm:ss" (for file headers such as SEPA). */
export function officeNow(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${officeToday(now)}T${get("hour")}:${get("minute")}:${get("second")}`;
}
