import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { day, recordColumns } from "./_columns";
import { vesselStatusEnum } from "./enums";
import { ports } from "./ports";

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
    /** Where the sailing loads and discharges (Settings › Ports). */
    polId: uuid().references(() => ports.id),
    podId: uuid().references(() => ports.id),
    etd: day(),
    eta: day(),
    atd: day(),
    ata: day(),
    status: vesselStatusEnum().notNull().default("scheduled"),
  },
  (t) => [index("vessels_etd_idx").on(t.etd)],
);
