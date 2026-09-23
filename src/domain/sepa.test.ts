import { describe, expect, it } from "vitest";
import { sepaProblem, sepaXml } from "./sepa";

const batch = {
  msgId: "ASAS-20260924-1",
  createdAt: "2026-09-23T10:00:00",
  executionDate: "2026-09-24",
  debtor: { name: "ASASLINE S.A.", iban: "BE41 0689 4162 5810", bic: "GKCCBEBB" },
  payments: [
    {
      endToEndId: "BILL/2026/00001",
      amountCents: 48_400,
      creditor: "Haulier & Co",
      iban: "be68 5390 0754 7034",
      reference: "F-2026-118 BILL/2026/00001",
    },
    {
      endToEndId: "BILL/2026/00002",
      amountCents: 12_100,
      creditor: "Port",
      iban: "BE68539007547034",
      reference: "+++090/9337/55493+++",
    },
  ],
};

describe("sepaProblem", () => {
  it("needs a valid IBAN and something to pay", () => {
    expect(sepaProblem({ iban: null, amountCents: 1 })).toBe("No IBAN on the supplier");
    expect(sepaProblem({ iban: "BE00 0000 0000 0000", amountCents: 1 })).toMatch(/not valid/);
    expect(sepaProblem({ iban: "BE68539007547034", amountCents: 0 })).toBe("Nothing open");
    expect(sepaProblem({ iban: "BE68539007547034", amountCents: 1 })).toBeNull();
  });
});

describe("sepaXml", () => {
  const xml = sepaXml(batch);

  it("counts and sums the batch in the header and the payment block", () => {
    expect(xml).toContain("<NbOfTxs>2</NbOfTxs><CtrlSum>605.00</CtrlSum>");
    expect(xml.match(/<CtrlSum>605.00<\/CtrlSum>/g)).toHaveLength(2);
  });

  it("writes IBANs compact and upper case, and escapes names", () => {
    expect(xml).toContain("<IBAN>BE41068941625810</IBAN>");
    expect(xml).toContain("<IBAN>BE68539007547034</IBAN>");
    expect(xml).toContain("<Nm>Haulier &amp; Co</Nm>");
  });

  it("sends a structured reference as one, and anything else as free text", () => {
    expect(xml).toContain("<Cd>SCOR</Cd></CdOrPrtry><Issr>BBA</Issr></Tp><Ref>090933755493</Ref>");
    expect(xml).toContain("<Ustrd>F-2026-118 BILL/2026/00001</Ustrd>");
  });
});
