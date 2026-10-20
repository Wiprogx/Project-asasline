/**
 * A legacy contact and a legacy user, read into the new shapes (legacy SEED_CONTACTS, the
 * field editor CF, the users table). Money becomes cents, dates stay "YYYY-MM-DD", nothing
 * that fails its check is carried silently: it lands in `warnings`.
 */
import { type ContactKind, CONTACT_KINDS } from "./contact-list";
import { idClean, LANGUAGES } from "./contacts";
import { parseYmd } from "./dates";
import { ibanOk } from "./iban";
import { type Role, ROLE_LABEL } from "./permissions";

export type LegacyContactRows = {
  contact: {
    name: string;
    type: "company" | "person";
    kind: ContactKind;
    professions: string[];
    tags: string[];
    country: string | null;
    lang: string;
    vat: string | null;
    eori: string | null;
    vatCheckedOn: string | null;
    eoriCheckedOn: string | null;
    phone: string | null;
    mobile: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
    creditLimitCents: number | null;
    usesLastPrice: boolean;
    paymentTermId: string | null;
    note: string | null;
  };
  addresses: {
    type: string;
    name: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    note: string | null;
  }[];
  banks: { iban: string; bic: string | null; label: string | null }[];
  warnings: string[];
};

const text = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
  return s || null;
};
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(text).filter((s): s is string => !!s) : [];
const country = (v: unknown) => {
  const s = text(v)?.toUpperCase() ?? null;
  return s && /^[A-Z]{2}$/.test(s) ? s : null;
};
const day = (v: unknown) => {
  const s = text(v);
  return s && parseYmd(s) ? s : null;
};
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];

function addressesOf(children: unknown) {
  return objects(children).map((c) => ({
    type: text(c.t) ?? "Other address",
    name: text(c.n),
    street: text(c.addr),
    zip: text(c.zip),
    city: text(c.city),
    country: country(c.country),
    phone: text(c.tel),
    email: text(c.email),
    note: text(c.note),
  }));
}

function banksOf(banks: unknown, warnings: string[]) {
  const out: LegacyContactRows["banks"] = [];
  for (const b of objects(banks)) {
    const iban = (text(b.iban) ?? "").replace(/\s+/g, "").toUpperCase();
    if (!iban) continue;
    if (!ibanOk(iban)) warnings.push(`IBAN ${iban} fails its check — left out`);
    else out.push({ iban, bic: text(b.bic)?.toUpperCase() ?? null, label: text(b.note) });
  }
  return out;
}

function langOf(v: unknown, warnings: string[]) {
  const lang = text(v)?.toLowerCase() ?? "en";
  if ((LANGUAGES as readonly string[]).includes(lang)) return lang;
  warnings.push(`language "${lang}" is not offered — set to English`);
  return "en";
}

function creditOf(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** One legacy contact body → the contact, its addresses and its bank accounts; null without a name. */
export function mapLegacyContact(b: Record<string, unknown>): LegacyContactRows | null {
  const name = text(b.name);
  if (!name) return null;
  const warnings: string[] = [];
  const kind = (CONTACT_KINDS as readonly string[]).includes(String(b.kind))
    ? (b.kind as ContactKind)
    : "customer";
  const docs = objects(b.docs).length;
  if (docs) warnings.push(`${docs} document(s) on the contact are files — not carried`);
  return {
    contact: {
      name,
      type: String(b.type).toLowerCase() === "person" ? "person" : "company",
      kind,
      professions: list(b.professions),
      tags: list(b.tags),
      country: country(b.country),
      lang: langOf(b.lang, warnings),
      vat: idClean(text(b.tva)) || null,
      eori: idClean(text(b.eori)) || null,
      vatCheckedOn: day(b.tvaChecked),
      eoriCheckedOn: day(b.eoriChecked),
      phone: text(b.tel),
      mobile: text(b.mobile),
      whatsapp: text(b.whatsapp),
      email: text(b.email),
      website: text(b.web),
      street: text(b.addr),
      zip: text(b.zip),
      city: text(b.city),
      creditLimitCents: creditOf(b.creditLimit),
      usesLastPrice: b.pricing === "last",
      paymentTermId: text(b.termId),
      note: text(b.note),
    },
    addresses: addressesOf(b.children),
    banks: banksOf(b.banks, warnings),
    warnings,
  };
}

export type LegacyUser = {
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  active: boolean;
};

const ROLE_OF = new Map<string, Role>(
  (Object.entries(ROLE_LABEL) as [Role, string][]).flatMap(([role, label]) => [
    [label.toLowerCase(), role],
    [role, role],
  ]),
);

/** A row of the legacy `users` table: the bcrypt hash kept as it is, so staff keep their passwords. */
export function mapLegacyUser(row: Record<string, unknown>): LegacyUser | { error: string } {
  const email = text(row.email)?.toLowerCase();
  if (!email || !email.includes("@")) return { error: `no e-mail (${text(row.name) ?? "?"})` };
  const role = ROLE_OF.get(text(row.role)?.toLowerCase() ?? "");
  if (!role) return { error: `${email}: role "${text(row.role) ?? ""}" is unknown` };
  const passwordHash = text(row.password_hash) ?? text(row.hash) ?? text(row.password) ?? "";
  if (!/^\$2[aby]\$\d\d\$/.test(passwordHash)) return { error: `${email}: no bcrypt hash` };
  const off = row.active === false || row.active === 0 || row.active === "0";
  return { email, name: text(row.name) ?? email, role, passwordHash, active: !off };
}
