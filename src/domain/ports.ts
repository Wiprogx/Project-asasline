/**
 * Ports (legacy PORTS): the UN/LOCODEs the office ships from and to. Each is a row of the
 * `ports` table (Settings › Ports) that quotations, bookings, catalogue items and sailings point
 * at; the legacy 316, by region, were its first rows (migration 0072).
 */
export type Port = { code: string; name: string; country: string; preClearance?: boolean };

export const PORT_CODE = /^[A-Z]{2}[A-Z2-9]{3}$/;

/** What a port is: a seaport, a river port, or an inland depot (ICD / dry port). */
export const PORT_KINDS = ["sea", "river", "inland"] as const;
export type PortKind = (typeof PORT_KINDS)[number];

export const PORT_KIND_LABELS: Record<PortKind, string> = {
  sea: "Seaport",
  river: "River port",
  inland: "Inland depot",
};

/** A code typed on a record, upper-cased; null when it is not a UN/LOCODE. */
export function portCode(text: string | null | undefined): string | null {
  const code = (text ?? "").trim().toUpperCase();
  return PORT_CODE.test(code) ? code : null;
}

/** "Lagos, Apapa; NGLOS" → the other names a port goes by, trimmed, each once (any case). */
export function parseAliases(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[;\n]/)
    .map((a) => a.trim())
    .filter((a) => a && !seen.has(a.toLowerCase()) && seen.add(a.toLowerCase()));
}

/** The suggestion a port field shows beside the code: "Douala (CM) · pre-clearance". */
export const portHint = (p: Port) =>
  `${p.name} (${p.country})${p.preClearance ? " · pre-clearance" : ""}`;
