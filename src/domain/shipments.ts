/**
 * Shipment vocabulary: booking statuses, directions and default cancel reasons (legacy ST,
 * STO, KINDS, CANCEL_REASONS). A cancelled shipment keeps its number, history and files; it
 * only leaves the active lists (invariant 1 — nothing numbered is deleted).
 */
export type Tone = "neutral" | "info" | "warning" | "danger" | "success";

export const BOOKING_STATUSES = [
  "quote",
  "sent",
  "confirmed",
  "in_transit",
  "customs",
  "arrived",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: Tone }> = {
  quote: { label: "Quotation", tone: "neutral" },
  sent: { label: "Sent", tone: "warning" },
  confirmed: { label: "Booking confirmation", tone: "info" },
  in_transit: { label: "In transit", tone: "info" },
  customs: { label: "Customs hold", tone: "danger" },
  arrived: { label: "Arrived", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** The forward flow; `cancelled` is off to the side and reversible. */
export const BOOKING_FLOW = [
  "quote",
  "sent",
  "confirmed",
  "in_transit",
  "customs",
  "arrived",
] as const satisfies readonly BookingStatus[];

export const SHIPMENT_KINDS = ["export", "import", "both"] as const;
export type ShipmentKind = (typeof SHIPMENT_KINDS)[number];

export const SHIPMENT_KIND_LABEL: Record<ShipmentKind, string> = {
  export: "Export",
  import: "Import",
  both: "Export + Import — the box is coming back",
};

/** Seed values only: the live list is a Settings table, editable without code (invariant 5). */
export const DEFAULT_CANCEL_REASONS = [
  "Goods not ready",
  "Price — the customer found cheaper",
  "Customs charges too high",
  "The customer cancelled the order",
  "A problem with the documents",
  "The carrier cancelled the sailing",
  "Other",
];

export const QUOTATION_STATUSES = ["draft", "sent", "accepted", "declined", "cancelled"] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];
