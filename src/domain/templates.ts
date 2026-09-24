/**
 * Message templates (legacy MSG_TEMPLATES): the letters the office writes again and again, with
 * {placeholders} filled from the file. A Settings table; these are its first rows. A placeholder
 * the file cannot fill shows "—", never an empty gap that reads as if nothing was missing.
 */
export const TEMPLATE_CHANNELS = ["email", "whatsapp", "both"] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export type Template = {
  code: string;
  name: string;
  channel: TemplateChannel;
  subject: string;
  body: string;
  active: boolean;
};

const SIGN = "{me} — ASASLINE S.A.";

export const DEFAULT_TEMPLATES: Template[] = [
  {
    code: "QUOTE_OUT",
    name: "Quotation",
    channel: "both",
    subject: "Quotation {ref} — {dest}",
    body: `Dear {client},\n\nPlease find our quotation {ref}.\n\n{lines}\n\nTotal: {total} (excluding VAT where it applies)\nValid until: {validUntil}\n\nThe printed quotation, with our general terms, follows as a PDF.\n\n${SIGN}`,
    active: true,
  },
  {
    code: "BK_CONFIRM",
    name: "Booking confirmation",
    channel: "both",
    subject: "Booking confirmation {ref} — {dest}",
    body: `Dear {client},\n\nYour booking is confirmed.\n\nBooking: {ref}\nDestination: {dest}\nContainer(s): {containers}\nVessel: {vessel} {voyage}\nETD {etd} · ETA {eta}\nDocument: {docName}\nCustoms closing: {customs}\n\n${SIGN}`,
    active: true,
  },
  {
    code: "DRIVER_COPY",
    name: "Trucker copy",
    channel: "whatsapp",
    subject: "Loading order {ref} — {containers}",
    body: "Loading order {ref}\nContainer(s): {containers}\nLoading: {loadDate} {loadTime} · {loadAddress}\nDestination: {dest}\nVessel {vessel} {voyage} · ETD {etd}\nPort cut-off {portcut}",
    active: true,
  },
  {
    code: "ASK_INVOICE",
    name: "Ask for the export invoice",
    channel: "both",
    subject: "Export invoice needed — {ref}",
    body: `Dear {client},\n\nFor the export declaration on {ref} ({dest}) we need your export invoice.\n\nIt must show the goods, weight, quantity and value, the container and seal numbers, and the incoterm.\n\nCustoms closing: {customs}\n\n${SIGN}`,
    active: true,
  },
  {
    code: "SI_OUT",
    name: "Shipping instruction to the line",
    channel: "email",
    subject: "Shipping instruction — {ref} — {containers}",
    body: `Dear colleagues,\n\nPlease find our shipping instruction for booking {ref}.\nContainer(s): {containers}\nVessel {vessel} {voyage} · ETD {etd}\nDocument type: {docName}\n\n${SIGN}`,
    active: true,
  },
  {
    code: "SAILED_OUT",
    name: "Departure notice",
    channel: "both",
    subject: "{ref} — sailed {etd} — {containers}",
    body: `Dear {client},\n\nYour cargo has sailed.\n\nBooking: {ref}\nContainer(s): {containers}\nVessel: {vessel} {voyage}\nSailed: {etd}\nDestination: {dest}\nEstimated arrival: {eta}\nDocument: {docName}\n\n${SIGN}`,
    active: true,
  },
];

/**
 * What a template is written for, read from its code so the Settings editor cannot lose it:
 * QUOTE_… letters go with a quotation, every other one with a booking.
 */
export const templateScope = (code: string): "quotation" | "booking" =>
  code.startsWith("QUOTE_") ? "quotation" : "booking";

/** The placeholders each kind of record fills. */
export const TEMPLATE_PLACEHOLDERS = {
  booking: [
    "client",
    "ref",
    "dest",
    "pol",
    "containers",
    "vessel",
    "voyage",
    "etd",
    "eta",
    "docName",
    "customs",
    "portcut",
    "loadDate",
    "loadTime",
    "loadAddress",
    "me",
  ],
  quotation: ["client", "ref", "dest", "total", "validUntil", "lines", "me"],
} as const;

/** Fills {placeholders}; an unknown or empty one reads "—". */
export function fillTemplate(
  text: string,
  vars: Record<string, string | null | undefined>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k]?.trim() || "—");
}

/** The placeholders a text uses, to show the editor what the office can write. */
export const placeholdersOf = (text: string) => [
  ...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])),
];
