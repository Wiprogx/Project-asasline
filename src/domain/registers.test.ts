import { describe, expect, it } from "vitest";
import {
  eoriRequestXml,
  parseEoriAnswer,
  parseViesAnswer,
  registerOf,
  viesRequest,
} from "./registers";

describe("registerOf", () => {
  it("sends an EU VAT number to VIES and an EU EORI to the EORI register", () => {
    expect(registerOf("BE", "vat")?.name).toBe("VIES");
    expect(registerOf("be", "eori")?.name).toBe("the EORI register");
    expect(registerOf("XI", "vat")?.id).toBe("vies");
  });

  it("knows no register for a country outside the EU, or none at all", () => {
    expect(registerOf("GB", "vat")).toBeNull();
    expect(registerOf("TR", "eori")).toBeNull();
    expect(registerOf(null, "vat")).toBeNull();
  });
});

describe("viesRequest", () => {
  it("strips the country prefix and speaks of Greece as EL", () => {
    expect(viesRequest("BE", "BE0464648410")).toEqual({ ms: "BE", number: "0464648410" });
    expect(viesRequest("GR", "EL123456789")).toEqual({ ms: "EL", number: "123456789" });
    expect(viesRequest("DE", "123456789")).toEqual({ ms: "DE", number: "123456789" });
  });
});

describe("parseViesAnswer", () => {
  it("reads a valid number with its name and address", () => {
    expect(
      parseViesAnswer({ isValid: true, userError: "VALID", name: "ANA NV", address: "Kaai 1" }),
    ).toEqual({ state: "valid", name: "ANA NV", address: "Kaai 1" });
  });

  it("reads INVALID as a verdict and anything else as no verdict", () => {
    expect(parseViesAnswer({ isValid: false, userError: "INVALID", name: "---" })).toEqual({
      state: "invalid",
    });
    expect(parseViesAnswer({ isValid: false, userError: "MS_MAX_CONCURRENT_REQ" })).toEqual({
      state: "unavailable",
      detail: "MS_MAX_CONCURRENT_REQ",
    });
    expect(parseViesAnswer("<html>").state).toBe("unavailable");
  });

  it("treats VIES's dashes as nothing said", () => {
    expect(parseViesAnswer({ isValid: true, name: "---", address: "---" })).toEqual({
      state: "valid",
      name: null,
      address: null,
    });
  });
});

const envelope = (results: string) =>
  `<?xml version='1.0' encoding='UTF-8'?><S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body><ns0:validateEORIResponse xmlns:ns0="http://eori.ws.eos.dds.s/"><return><requestDate>04/11/2026</requestDate>${results}</return></ns0:validateEORIResponse></S:Body></S:Envelope>`;

describe("the EORI service", () => {
  it("is asked for one number in the Commission's envelope", () => {
    expect(eoriRequestXml("BE0464648410")).toContain("<eos:eori>BE0464648410</eos:eori>");
    expect(eoriRequestXml("<x>")).not.toContain("<x>");
  });

  it("reads status 0 as valid with the published name and address", () => {
    const xml = envelope(
      "<result><eori>BE0464648410</eori><status>0</status><statusDescr>Valid</statusDescr><name>ANA</name><street>Antwerpsesteenweg 43</street><postalCode>2840</postalCode><city>Rumst</city><country>Belgium</country></result>",
    );
    expect(parseEoriAnswer(xml)).toEqual({
      state: "valid",
      name: "ANA",
      address: "Antwerpsesteenweg 43, 2840 Rumst, Belgium",
    });
  });

  it("reads status 1 as not valid", () => {
    const xml = envelope(
      "<result><eori>BE0123456789</eori><status>1</status><statusDescr>Not valid</statusDescr></result>",
    );
    expect(parseEoriAnswer(xml)).toEqual({ state: "invalid" });
  });

  it("reads a holder who publishes nothing as valid without a name", () => {
    const xml = envelope(
      "<result><eori>DE1</eori><status>0</status><statusDescr>Valid</statusDescr></result>",
    );
    expect(parseEoriAnswer(xml)).toEqual({ state: "valid", name: null, address: null });
  });

  it("reads a service error or a fault as no verdict", () => {
    expect(parseEoriAnswer(envelope("<errorDescription>Service busy</errorDescription>"))).toEqual({
      state: "unavailable",
      detail: "Service busy",
    });
    expect(parseEoriAnswer("<S:Fault><faultstring>Down</faultstring></S:Fault>")).toEqual({
      state: "unavailable",
      detail: "Down",
    });
  });
});
