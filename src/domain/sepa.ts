/**
 * Paying suppliers in one file (legacy sepaXml): an ISO 20022 pain.001.001.03 credit transfer
 * to upload to the bank. The file is an instruction, not a payment: each bill is booked as
 * paid when the statement shows the money leaving and is matched, like any bank line.
 */
import { ibanOk } from "./iban";
import { ogmOk } from "./ogm";
import { euros, xe } from "./vat";

export type SepaPayment = {
  endToEndId: string;
  amountCents: number;
  creditor: string;
  iban: string;
  bic?: string | null;
  /** A Belgian structured reference goes as one; anything else as free text. */
  reference: string;
};

export type SepaBatch = {
  msgId: string;
  createdAt: string;
  executionDate: string;
  debtor: { name: string; iban: string; bic: string };
  payments: SepaPayment[];
};

/** What stops a payment going into the file. */
export function sepaProblem(p: { iban: string | null; amountCents: number }): string | null {
  if (!p.iban) return "No IBAN on the supplier";
  if (!ibanOk(p.iban)) return "The supplier's IBAN is not valid";
  if (p.amountCents <= 0) return "Nothing open";
  return null;
}

const compact = (s: string) => s.replace(/\s+/g, "").toUpperCase();

function remittance(reference: string): string {
  if (ogmOk(reference)) {
    const digits = reference.replace(/\D/g, "");
    return `<RmtInf><Strd><CdtrRefInf><Tp><CdOrPrtry><Cd>SCOR</Cd></CdOrPrtry><Issr>BBA</Issr></Tp><Ref>${digits}</Ref></CdtrRefInf></Strd></RmtInf>`;
  }
  return `<RmtInf><Ustrd>${xe(reference.slice(0, 140))}</Ustrd></RmtInf>`;
}

export function sepaXml(b: SepaBatch): string {
  const n = b.payments.length;
  const sum = euros(b.payments.reduce((s, p) => s + p.amountCents, 0));
  const tx = b.payments.map(
    (
      p,
    ) => `      <CdtTrfTxInf><PmtId><EndToEndId>${xe(p.endToEndId.slice(0, 35))}</EndToEndId></PmtId><Amt><InstdAmt Ccy="EUR">${euros(p.amountCents)}</InstdAmt></Amt>${p.bic ? `<CdtrAgt><FinInstnId><BIC>${xe(compact(p.bic))}</BIC></FinInstnId></CdtrAgt>` : ""}
        <Cdtr><Nm>${xe(p.creditor.slice(0, 70))}</Nm></Cdtr><CdtrAcct><Id><IBAN>${xe(compact(p.iban))}</IBAN></Id></CdtrAcct>${remittance(p.reference)}</CdtTrfTxInf>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr><MsgId>${xe(b.msgId)}</MsgId><CreDtTm>${xe(b.createdAt)}</CreDtTm><NbOfTxs>${n}</NbOfTxs><CtrlSum>${sum}</CtrlSum><InitgPty><Nm>${xe(b.debtor.name)}</Nm></InitgPty></GrpHdr>
    <PmtInf>
      <PmtInfId>${xe(b.msgId)}-1</PmtInfId><PmtMtd>TRF</PmtMtd><BtchBookg>true</BtchBookg><NbOfTxs>${n}</NbOfTxs><CtrlSum>${sum}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${xe(b.executionDate)}</ReqdExctnDt>
      <Dbtr><Nm>${xe(b.debtor.name)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${xe(compact(b.debtor.iban))}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BIC>${xe(b.debtor.bic)}</BIC></FinInstnId></DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${tx.join("\n")}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;
}
