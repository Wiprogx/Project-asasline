/**
 * The office's timestamp, "YYYY-MM-DD HH:MM" in Brussels time, the way the legacy log printed
 * it. One formatter for the audit log, a booking's history and the messages.
 */
const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Brussels",
  dateStyle: "short",
  timeStyle: "short",
});

export const formatStamp = (at: Date) => stamp.format(at);
