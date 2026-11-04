import type { IdKind } from "./contacts";

/**
 * The online registers a number is checked against (legacy "Verify"): VIES for an EU VAT
 * number, the Commission's EORI service for an EU EORI. A format table cannot keep up with a
 * register — Belgium now issues BE1… enterprise numbers beside BE0… — so where a register
 * answers, its answer is the truth and no pattern is applied. A country without one (AE, TR,
 * GB since 2021…) is taken on the office's word, as in the legacy app.
 */
export const EU_VAT_AREA = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "XI",
] as const;

export type Register = { id: "vies" | "eori"; name: string };

const VIES: Register = { id: "vies", name: "VIES" };
const EORI: Register = { id: "eori", name: "the EORI register" };

/** The register that knows this kind of number for this country, or null when there is none online. */
export function registerOf(country: string | null | undefined, kind: IdKind): Register | null {
  const cc = (country ?? "").toUpperCase();
  if (!(EU_VAT_AREA as readonly string[]).includes(cc)) return null;
  return kind === "vat" ? VIES : EORI;
}

export type RegisterAnswer =
  /** The register knows the number; the name and address when it publishes them. */
  | { state: "valid"; name: string | null; address: string | null }
  /** The register does not know the number: a typo, or no longer registered. */
  | { state: "invalid" }
  /** No verdict: the register, or a member state's end of it, is not answering. */
  | { state: "unavailable"; detail: string };

/* ---- VIES: GET https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{MS}/vat/{number} ---- */

/** VIES speaks of Greece as EL and wants the number without its country prefix. */
export function viesRequest(country: string, value: string): { ms: string; number: string } {
  const cc = country.toUpperCase();
  const ms = cc === "GR" ? "EL" : cc;
  const number = value.startsWith(cc) || value.startsWith(ms) ? value.slice(2) : value;
  return { ms, number };
}

/** VIES writes "---" where it has nothing to say. */
const said = (v: unknown) =>
  typeof v === "string" && v.trim() && v.trim() !== "---" ? v.trim() : null;

/** The VIES REST answer: isValid with the name and address, or a userError naming why not. */
export function parseViesAnswer(json: unknown): RegisterAnswer {
  if (!json || typeof json !== "object")
    return { state: "unavailable", detail: "no readable answer" };
  const a = json as { isValid?: unknown; userError?: unknown; name?: unknown; address?: unknown };
  if (a.isValid === true) return { state: "valid", name: said(a.name), address: said(a.address) };
  if (a.userError === "INVALID") return { state: "invalid" };
  return {
    state: "unavailable",
    detail: typeof a.userError === "string" ? a.userError : "no verdict",
  };
}

/* ---- EORI: POST https://ec.europa.eu/taxation_customs/dds2/eos/validation/services/validation ---- */

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The one operation the service has, validateEORI, asked for one number. */
export const eoriRequestXml = (eori: string) =>
  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:eos="http://eori.ws.eos.dds.s/">` +
  `<soapenv:Header/><soapenv:Body><eos:validateEORI><eos:eori>${xmlEscape(eori)}</eos:eori></eos:validateEORI></soapenv:Body></soapenv:Envelope>`;

const tag = (xml: string, name: string) => {
  const m = new RegExp(`<(?:[\\w-]+:)?${name}>([^<]*)</(?:[\\w-]+:)?${name}>`).exec(xml);
  return m ? m[1].trim() : null;
};

/**
 * The service answers per number: status 0 "Valid" with the name and address when the holder
 * agreed to publish them, 1 "Not valid"; anything else (an errorDescription, a SOAP fault) is
 * no verdict.
 */
export function parseEoriAnswer(xml: string): RegisterAnswer {
  const result = /<(?:[\w-]+:)?result>([\s\S]*?)<\/(?:[\w-]+:)?result>/.exec(xml)?.[1];
  if (!result) {
    const why = tag(xml, "errorDescription") ?? tag(xml, "faultstring") ?? "no readable answer";
    return { state: "unavailable", detail: why };
  }
  const status = tag(result, "status");
  if (status === "1") return { state: "invalid" };
  if (status !== "0")
    return {
      state: "unavailable",
      detail: tag(result, "errorReason") ?? tag(result, "statusDescr") ?? "no verdict",
    };
  const address = [
    tag(result, "street"),
    [tag(result, "postalCode"), tag(result, "city")].filter(Boolean).join(" "),
    tag(result, "country"),
  ]
    .filter(Boolean)
    .join(", ");
  return { state: "valid", name: tag(result, "name") || null, address: address || null };
}
