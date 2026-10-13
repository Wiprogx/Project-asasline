/**
 * Certiweight on a booking (legacy toggleCerti, certiLocked). Sold on the quotation, it is on
 * the booking: a step per box and a slot for each certificate. Not sold, it can be switched on
 * from the booking, which puts the charge on the quotation so it is invoiced. Once a
 * certificate is in, the weighing was done: it cannot be taken off either of them.
 */
export const CERTI_RE = /certiweight/i;

export const isCertiweight = (label: string | null | undefined) => !!label && CERTI_RE.test(label);

export type CertiState = "off" | "sold" | "filed";

export const certiState = (sold: boolean, filed: boolean): CertiState =>
  !sold ? "off" : filed ? "filed" : "sold";

/** What the card says for each state (legacy certiLockWhy and the card's hint). */
export const CERTI_META: Record<CertiState, { status: string; hint: string }> = {
  off: {
    status: "Not sold on this shipment",
    hint: "Switching it on adds the charge to the quotation and opens the certificate step for each box.",
  },
  sold: {
    status: "Sold — the certificate is expected",
    hint: "No certificate is in yet, so it can still be cancelled: the charge comes off the quotation with it.",
  },
  filed: {
    status: "Filed — the weighing was done",
    hint: "The certificate is in and we hold the paper, so the charge stays on the quotation and the booking.",
  },
};
