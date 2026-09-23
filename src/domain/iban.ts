/** IBAN mod-97 check (ISO 13616), done digit by digit so no number overflows. */
export function ibanOk(value: string): boolean {
  const v = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  const moved = (v.slice(4) + v.slice(0, 4)).replace(/[A-Z]/g, (ch) =>
    String(ch.charCodeAt(0) - 55),
  );
  let r = 0;
  for (const d of moved) r = (r * 10 + Number(d)) % 97;
  return r === 1;
}

export const ibanPretty = (v: string) =>
  v
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
