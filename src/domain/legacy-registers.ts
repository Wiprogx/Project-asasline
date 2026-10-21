/**
 * The legacy registers the shipments lean on: the vessel register (legacy VESSELS, a setting)
 * and the customers' price agreements (legacy PRICE_LISTS, records). Ports become UN/LOCODEs,
 * prices cents; a line whose catalogue item is unknown is left out and said.
 */
import { portCode } from "./legacy-config";
import { VESSEL_STATUSES, type VesselStatus } from "./vessels";

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v: unknown) => {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) : 0);

export function mapLegacyVessel(v: Record<string, unknown>) {
  const name = text(v.name);
  const voyage = text(v.voyage);
  if (!name || !voyage) return null;
  const status = (VESSEL_STATUSES as readonly string[]).includes(String(v.status))
    ? (v.status as VesselStatus)
    : "scheduled";
  return {
    name,
    imo: text(v.imo),
    carrier: text(v.carrier),
    service: text(v.service),
    voyage,
    pol: portCode(v.pol),
    pod: portCode(v.pod),
    etd: day(v.etd),
    eta: day(v.eta),
    atd: day(v.atd),
    ata: day(v.ata),
    status,
  };
}

export function mapLegacyPriceList(
  pl: Record<string, unknown>,
  item: (legacyItemId: string) => string | undefined,
) {
  const name = text(pl.name);
  if (!name) return null;
  const warnings: string[] = [];
  const lines: { itemId: string; sellCents: number; buyCents: number }[] = [];
  const seen = new Set<string>();
  for (const l of Array.isArray(pl.lines) ? (pl.lines as Record<string, unknown>[]) : []) {
    const itemId = item(String(l?.itemId ?? ""));
    if (!itemId) {
      warnings.push(`catalogue item ${String(l?.itemId)} not found — its agreed price left out`);
      continue;
    }
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    lines.push({ itemId, sellCents: cents(l.sell), buyCents: cents(l.buy) });
  }
  return {
    list: {
      name,
      validFrom: day(pl.validFrom),
      validUntil: day(pl.validUntil),
      active: pl.active !== false,
    },
    contact: { legacyId: pl.contactId ?? null, name: text(pl.contact) },
    lines,
    warnings,
  };
}
