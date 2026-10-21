/**
 * One legacy catalogue item (legacy RATE_ITEMS) as a `rate_items` row: euros become cents,
 * "Antwerp (BEANR)" its UN/LOCODE, "40F HC" the new container type, the VAT label its code.
 * What has no place in the new catalogue is said in `warnings`, never dropped silently.
 */
import { boxType, portCode } from "./legacy-config";
import { FREE_KINDS, FREE_SIDES } from "./pricing";

export type RateItemRow = {
  category: string;
  name: string | null;
  pol: string | null;
  pod: string | null;
  country: string | null;
  containerType: string | null;
  carrier: string | null;
  transitDays: number | null;
  fromPlace: string | null;
  toPlace: string | null;
  docCode: string | null;
  freeDays: number | null;
  sellCents: number;
  buyCents: number;
  vatCode: string;
  rateType: string;
  scope: string | null;
  freeKind: string | null;
  side: string | null;
  validUntil: string | null;
  note: string | null;
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const whole = (v: unknown) =>
  Number.isFinite(Number(v)) && v !== "" && v !== null ? Math.round(Number(v)) : null;
const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) : 0);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** The legacy VAT label as a code: "21%" → S21, "6%" → S6, the 0% export exemption → EX41. */
export function vatCodeOf(label: unknown): string {
  const s = String(label ?? "").trim();
  if (/^21\s*%/.test(s)) return "S21";
  if (/^6\s*%/.test(s)) return "S6";
  return "EX41";
}

export function mapRateItem(
  it: Record<string, unknown>,
): { row: RateItemRow; warnings: string[] } | null {
  const category = text(it.cat);
  if (!category) return null;
  const warnings: string[] = [];
  const ftype = text(it.ftype);
  const freeKind = ftype && (FREE_KINDS as readonly string[]).includes(ftype) ? ftype : null;
  if (ftype && !freeKind)
    warnings.push(`free time of kind "${ftype}" has no kind of its own here — it applies to all`);
  const side = text(it.side);
  const country = text(it.country)?.toUpperCase() ?? null;
  return {
    row: {
      category,
      // A legacy free-time item has no name; the new catalogue names it (domain/pricing NEEDS).
      name:
        text(it.name) ??
        (category === "freetime" && ftype
          ? `${ftype[0].toUpperCase()}${ftype.slice(1)}${side ? ` — ${side}` : ""}`
          : null),
      pol: portCode(it.pol),
      pod: portCode(it.pod),
      country: country && /^[A-Z]{2}$/.test(country) ? country : null,
      containerType: text(it.ctype) ? boxType(String(it.ctype)) : null,
      carrier: text(it.carrier),
      transitDays: whole(it.transit),
      fromPlace: text(it.fromLoc),
      toPlace: text(it.toLoc),
      docCode: text(it.docCode),
      freeDays: whole(it.freeDays),
      sellCents: cents(it.sell),
      buyCents: cents(it.buy),
      vatCode: vatCodeOf(it.vat),
      rateType: text(it.rateType) ?? "contract",
      scope: text(it.scope),
      freeKind,
      side: side && (FREE_SIDES as readonly string[]).includes(side) ? side : null,
      validUntil: day(it.validUntil),
      note:
        [text(it.notes), ftype && !freeKind ? `Legacy free time: ${ftype}` : null]
          .filter(Boolean)
          .join(" · ") || null,
    },
    warnings,
  };
}
