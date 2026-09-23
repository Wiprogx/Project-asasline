/**
 * Money is integer cents end to end (the database has no float money columns).
 * "—" means no figure yet; "⚠" means a figure that went wrong. Legacy fmt() once printed
 * both as a dash, so a NaN price looked free on the quotation (audit B.2).
 */
export function formatCents(cents: number | null | undefined, currency = "EUR"): string {
  if (cents === null || cents === undefined) return "—";
  if (!Number.isFinite(cents)) return "⚠";
  return new Intl.NumberFormat("en-BE", { style: "currency", currency }).format(cents / 100);
}

export function toCents(input: string): number | null {
  const t = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}
