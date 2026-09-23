/**
 * Belgian structured communication (+++123/4567/89012+++): ten digits and a mod-97 check.
 * Same behaviour as the legacy ogmMake / ogmOk.
 */
const digits = (s: string) => s.replace(/\D/g, "");

export function ogmMake(invoiceNumber: string | number): string {
  const base = "1" + digits(String(invoiceNumber)).slice(-9).padStart(9, "0");
  const s = base + String(Number(base) % 97 || 97).padStart(2, "0");
  return `+++${s.slice(0, 3)}/${s.slice(3, 7)}/${s.slice(7)}+++`;
}

export function ogmOk(s: string): boolean {
  const d = digits(s);
  return d.length === 12 && (Number(d.slice(0, 10)) % 97 || 97) === Number(d.slice(10));
}
