import { index, pgTable, text } from "drizzle-orm/pg-core";
import { day, recordColumns } from "./_columns";
import { vesselStatusEnum } from "./enums";

/**
 * A sailing of the vessel register: one ship on one voyage between two ports. Bookings on it
 * take their dates and closings from here (domain/vessels); moving it moves them.
 */
export const vessels = pgTable(
  "vessels",
  {
    ...recordColumns,
    name: text().notNull(),
    imo: text(),
    carrier: text(),
    service: text(),
    voyage: text().notNull(),
    pol: text(),
    pod: text(),
    etd: day(),
    eta: day(),
    atd: day(),
    ata: day(),
    status: vesselStatusEnum().notNull().default("scheduled"),
  },
  (t) => [index("vessels_etd_idx").on(t.etd)],
);
