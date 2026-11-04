import "server-only";
import type { IdKind } from "@/domain/contacts";
import {
  eoriRequestXml,
  parseEoriAnswer,
  parseViesAnswer,
  type RegisterAnswer,
  registerOf,
  viesRequest,
} from "@/domain/registers";
import { env } from "@/env";

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/ms";
const EORI_URL = "https://ec.europa.eu/taxation_customs/dds2/eos/validation/services/validation";
/** VIES answers in a second or two; a member state that hangs is reported, not waited for. */
const TIMEOUT_MS = 10_000;

async function askVies(country: string, value: string): Promise<RegisterAnswer> {
  const { ms, number } = viesRequest(country, value);
  const res = await fetch(`${VIES_URL}/${ms}/vat/${encodeURIComponent(number)}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return { state: "unavailable", detail: `VIES answered HTTP ${res.status}` };
  return parseViesAnswer(await res.json());
}

async function askEori(value: string): Promise<RegisterAnswer> {
  const res = await fetch(EORI_URL, {
    method: "POST",
    headers: { "content-type": "text/xml;charset=UTF-8", soapaction: "" },
    body: eoriRequestXml(value),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const xml = await res.text();
  if (!res.ok && !xml.includes("<"))
    return { state: "unavailable", detail: `the EORI register answered HTTP ${res.status}` };
  return parseEoriAnswer(xml);
}

/**
 * Asks the register that knows the number (VIES for an EU VAT number, the Commission's EORI
 * service for an EU EORI). Null when no register is online for that country; a register that
 * is down, slow or switched off on this server (ID_REGISTERS=off, the browser suite) is
 * "unavailable", never a verdict — only the register itself says valid or invalid.
 */
export async function lookupRegister(
  kind: IdKind,
  country: string | null | undefined,
  value: string,
): Promise<RegisterAnswer | null> {
  const register = registerOf(country, kind);
  if (!register) return null;
  if (env.ID_REGISTERS === "off")
    return { state: "unavailable", detail: "register lookups are switched off on this server" };
  try {
    return kind === "vat" ? await askVies(country!, value) : await askEori(value);
  } catch (e) {
    const why =
      e instanceof Error && e.name === "TimeoutError"
        ? "no answer in time"
        : String(e instanceof Error ? e.message : e);
    return { state: "unavailable", detail: why };
  }
}
