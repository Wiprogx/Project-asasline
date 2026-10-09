import type { Holiday } from "./calendar";

/** Legacy HOLIDAYS (2026). Editable in Settings › Holidays. */
export const DEFAULT_HOLIDAYS: Holiday[] = [
  { country: "BE", date: "2026-01-01", name: "New Year" },
  { country: "BE", date: "2026-04-06", name: "Easter Monday" },
  { country: "BE", date: "2026-05-01", name: "Labour Day" },
  { country: "BE", date: "2026-05-14", name: "Ascension" },
  { country: "BE", date: "2026-05-25", name: "Whit Monday" },
  { country: "BE", date: "2026-07-21", name: "National Day" },
  { country: "BE", date: "2026-08-15", name: "Assumption" },
  { country: "BE", date: "2026-11-01", name: "All Saints" },
  { country: "BE", date: "2026-11-11", name: "Armistice" },
  { country: "BE", date: "2026-12-25", name: "Christmas" },
  { country: "NL", date: "2026-04-27", name: "King's Day" },
  { country: "NL", date: "2026-05-05", name: "Liberation Day" },
  { country: "FR", date: "2026-07-14", name: "Bastille Day" },
  { country: "GA", date: "2026-08-17", name: "Independence Day — Gabon" },
  { country: "CM", date: "2026-05-20", name: "National Day — Cameroon" },
  { country: "EG", date: "2026-07-23", name: "Revolution Day — Egypt" },
];
