import { OFFICE_PARTIES } from "@/domain/booking-parties";

const FIELDS = [
  "kind",
  "docTypeId",
  "payerId",
  "shipperId",
  "consigneeId",
  "notifyId",
  ...OFFICE_PARTIES.map((p) => p.key),
  "pickupDepotId",
  "pickupDepot",
  "terminalId",
  "terminal",
  "pol",
  "pod",
  "commodity",
  "carrierBookingNo",
  "blNo",
  "vesselName",
  "voyage",
  "etd",
  "etdTime",
  "eta",
  "etaTime",
  "customsClosing",
  "customsClosingTime",
  "vgmClosing",
  "vgmClosingTime",
  "siClosing",
  "siClosingTime",
  "portCutOff",
  "portCutOffTime",
] as const;

type Field = (typeof FIELDS)[number];

/** The booking as the details form reads it: every editable field, the copy list as one line. */
export function toDetailsValues(
  b: { id: string; version: number; cc: string[] } & Record<Field, string | null>,
) {
  const out: { id: string; version: number; [field: string]: string | number | null } = {
    id: b.id,
    version: b.version,
    cc: b.cc.join(", "),
  };
  for (const k of FIELDS) out[k] = b[k];
  return out;
}
