/** Contact vocabulary (legacy CHILD_TYPES, contact types). Seed values for Settings tables. */
export const CONTACT_TYPES = ["company", "person"] as const;

export const ADDRESS_TYPES = [
  "Doc Check",
  "Contact",
  "Invoicing address",
  "Delivery address",
  "Shipper",
  "Consignee",
  "Notify Party",
  "Weight address",
  "Terminal",
  "Depot",
  "Other address",
] as const;

/** Correspondence language is per contact; the UI stays English (invariant 10). */
export const LANGUAGES = ["en", "fr", "nl", "tr", "ar"] as const;

/** A stable lettermark from a name: same company, same initials, on every screen. */
export function lettermark(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const second = words.length > 1 ? (words[1][0] ?? "") : (words[0][1] ?? "");
  return (first + second).toUpperCase();
}
