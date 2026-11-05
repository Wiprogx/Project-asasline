import type { TableViewSpec } from "./table-prefs";

/**
 * The bookings list as the office reads it (legacy B_COLS, B_COLS_DEFAULT): the columns a person
 * chooses for the table and how wide they drag each one, kept as their own (domain/table-prefs).
 * The reference is always the first column.
 */
export const BOOKING_COLUMNS = [
  { key: "kind", label: "Export / Import", width: 120 },
  { key: "status", label: "Status", width: 150 },
  { key: "client", label: "Customer", width: 200 },
  { key: "route", label: "Route", width: 140 },
  { key: "load", label: "Loading address", width: 220 },
  { key: "loadDate", label: "Loading date", width: 130 },
  { key: "mode", label: "Loading mode", width: 130 },
  { key: "trucker", label: "Trucker", width: 160 },
  { key: "carrier", label: "Shipping line", width: 160 },
  { key: "bookingNo", label: "Carrier booking n°", width: 150 },
  { key: "blNo", label: "B/L n°", width: 150 },
  { key: "boxes", label: "Containers", width: 160 },
  { key: "vessel", label: "Vessel · voyage", width: 180 },
  { key: "portCutOff", label: "Port cut-off", width: 120 },
  { key: "vgmClosing", label: "VGM closing", width: 120 },
  { key: "customsClosing", label: "Customs closing", width: 130 },
  { key: "siClosing", label: "Shipping instruction", width: 150 },
  { key: "etd", label: "ETD", width: 110 },
  { key: "eta", label: "ETA", width: 110 },
  { key: "steps", label: "Open steps", width: 120 },
  { key: "docs", label: "Documents", width: 110 },
  { key: "value", label: "Value", width: 130 },
  { key: "billing", label: "Invoiced", width: 140 },
] as const;
export type BookingColumnKey = (typeof BOOKING_COLUMNS)[number]["key"];
/** The reference column is always shown, its alert under it; it is sized like the others. */
export const BOOKING_REF_COLUMN = { key: "ref", label: "Our reference", width: 200 } as const;
export const DEFAULT_BOOKING_COLUMNS: readonly BookingColumnKey[] = [
  "status",
  "client",
  "route",
  "loadDate",
  "bookingNo",
  "boxes",
  "portCutOff",
  "vgmClosing",
  "customsClosing",
  "siClosing",
  "etd",
  "eta",
  "steps",
  "value",
  "billing",
];
/** Where a person's columns and widths are kept, and what they may size. */
export const BOOKING_VIEW: TableViewSpec<BookingColumnKey> = {
  key: "bookings.list",
  all: BOOKING_COLUMNS,
  defaults: DEFAULT_BOOKING_COLUMNS,
  sizable: [BOOKING_REF_COLUMN.key, ...BOOKING_COLUMNS.map((c) => c.key)],
};

/** A closing past while the box has not sailed is late (legacy cutCell). */
export const closingLate = (day: string | null, status: string, today: string) =>
  !!day && day < today && ["quote", "sent", "confirmed"].includes(status);
