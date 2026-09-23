import { ogmOk } from "./ogm";

/**
 * Bank statements (legacy parseCoda / parseBankCsv): CODA, the Belgian banks' fixed-width
 * statement (Febelfin 2.x, 128 characters a line), and the CSV the banks' web sites export
 * with English, French or Dutch headers. Amounts become integer cents; dates "YYYY-MM-DD".
 * Positions are 1-based in the comments, as in the Febelfin description; to be checked
 * against a real Belfius file before going live (as the legacy note said).
 */
export type Move = {
  date: string;
  amountCents: number;
  name: string;
  iban: string;
  comm: string;
  ogm: string;
  ref: string;
};

export type Statement = { source: "CODA" | "CSV"; account: string; moves: Move[] };

const OGM_RE = /\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+|\*\*\*\d{3}\/\d{4}\/\d{5}\*\*\*/;
const ogmFrom12 = (d: string) => `+++${d.slice(0, 3)}/${d.slice(3, 7)}/${d.slice(7, 12)}+++`;

const codaDate = (s: string) =>
  /^\d{6}$/.test(s) ? `20${s.slice(4, 6)}-${s.slice(2, 4)}-${s.slice(0, 2)}` : "";
/** 15 digits with three decimals (pos 33-47) → cents, signed by pos 32 (1 = debit). */
const codaCents = (sign: string, digits: string) =>
  (sign === "1" ? -1 : 1) * Math.round(Number(digits) / 10);
const ibanIn = (s: string) =>
  s.replace(/\s/g, "").match(/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}?(?=[A-Z]{3}$|$)/)?.[0] ?? "";

export function parseCoda(text: string): Statement | null {
  const rows = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.padEnd(128, " "));
  if (!rows.length || rows[0][0] !== "0") return null;
  const out: Statement = { source: "CODA", account: "", moves: [] };
  let cur: Move | null = null;
  for (const L of rows) {
    if (L[0] === "1") out.account = ibanIn(L.slice(5, 42));
    else if (L[0] === "2" && L[1] === "1") {
      // A detail line (pos 7-10 ≠ 0000) belongs to a grouped movement already counted.
      if (L.slice(6, 10) !== "0000") {
        cur = null;
        continue;
      }
      const structured = L[61] === "1" && /^10[12]/.test(L.slice(62, 65));
      const digits = L.slice(65, 77);
      cur = {
        ref: L.slice(10, 31).trim(),
        amountCents: codaCents(L[31], L.slice(32, 47)),
        date: codaDate(L.slice(115, 121)) || codaDate(L.slice(47, 53)),
        ogm: structured && ogmOk(digits) ? ogmFrom12(digits) : "",
        comm: structured ? "" : L.slice(62, 115),
        name: "",
        iban: "",
      };
      out.moves.push(cur);
    } else if (L[0] === "2" && L[1] === "2" && cur) cur.comm += L.slice(10, 63);
    else if (L[0] === "2" && L[1] === "3" && cur) {
      cur.iban = ibanIn(L.slice(10, 47));
      cur.name = L.slice(47, 82).trim();
      cur.comm += L.slice(82, 125);
    }
  }
  for (const m of out.moves) m.comm = m.comm.replace(/\s+/g, " ").trim();
  return out;
}

function splitCsv(line: string, sep: string): string[] {
  const out: string[] = [];
  let cell = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === sep && !quoted) {
      out.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
}

const csvDate = (s: string) => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[0];
  const eu = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  return eu ? `${eu[3]}-${eu[2].padStart(2, "0")}-${eu[1].padStart(2, "0")}` : "";
};

/** "1.234,56" and "1,234.56" and "-12,5" all read right; anything else is not an amount. */
export function csvCents(raw: string): number | null {
  let s = raw.replace(/\s|€|EUR/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function parseBankCsv(text: string): Statement | null {
  const rows = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (rows.length < 2) return null;
  const sep = [";", ",", "\t"].sort((a, b) => rows[0].split(b).length - rows[0].split(a).length)[0];
  const header = rows.findIndex((r, k) => {
    const c = splitCsv(r, sep).map((x) => x.toLowerCase());
    return (
      k < 15 &&
      c.some((x) => /date|datum/.test(x)) &&
      c.some((x) => /amount|montant|bedrag/.test(x))
    );
  });
  if (header < 0) return null;
  const H = splitCsv(rows[header], sep).map((x) => x.toLowerCase());
  const col = (...res: RegExp[]) => {
    for (const re of res) {
      const k = H.findIndex((x) => re.test(x));
      if (k >= 0) return k;
    }
    return -1;
  };
  const cDate = col(/boekingsdatum|date de comptabilisation|booking date/, /date|datum/);
  const cAmount = col(/amount|montant|bedrag/);
  const cName = col(/naam tegenpartij|nom de la contrepartie|counterparty name/, /naam|nom|name/);
  const cIban = col(/rekening tegenpartij|compte (de la )?contrepartie|counterparty account|iban/);
  const cComm = col(/mededeling|communication|description|details|omschrijving|message/);

  const out: Statement = { source: "CSV", account: "", moves: [] };
  for (const r of rows.slice(header + 1)) {
    const c = splitCsv(r, sep);
    const cents = csvCents(c[cAmount] ?? "");
    const date = csvDate(c[cDate] ?? "");
    if (!cents || !date) continue;
    const comm = cComm >= 0 ? (c[cComm] ?? "") : "";
    const ogm = (OGM_RE.exec(comm)?.[0] ?? "").replace(/\*/g, "+");
    out.moves.push({
      date,
      amountCents: cents,
      name: cName >= 0 ? (c[cName] ?? "") : "",
      iban: cIban >= 0 ? (c[cIban] ?? "").replace(/\s/g, "").toUpperCase() : "",
      comm: ogm ? "" : comm,
      ogm,
      ref: "",
    });
  }
  return out;
}

/** CODA when the file starts like one, else CSV; null when neither reads. */
export function parseStatement(text: string): Statement | null {
  const first = text.replace(/^﻿/, "").split(/\r?\n/)[0] ?? "";
  const coda = /^0000\d/.test(first) && first.length >= 100 ? parseCoda(text) : null;
  if (coda?.moves.length) return coda;
  const csv = parseBankCsv(text);
  return csv?.moves.length ? csv : null;
}

/** The same movement imported twice (two exports that overlap) is recognised and skipped. */
export const dedupKey = (account: string, m: Move, index: number) =>
  [account, m.date, m.amountCents, m.ogm || m.comm, m.iban, m.ref || `#${index}`].join("|");
