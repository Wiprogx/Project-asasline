/**
 * Where the office stands with one contact (legacy contact Invoices tab): what they owe us on
 * issued invoices and how much of it is overdue, and what we owe them on their recorded bills.
 * Credit notes and payments are already taken off each document's open amount.
 */
import { openCents } from "./payments";

export type PartnerDoc = {
  kind: "invoice" | "bill";
  grossCents: number;
  settledCents: number;
  creditedCents: number;
  dueDate: string | null;
};

export type PartnerBalance = {
  theyOweCents: number;
  overdueCents: number;
  overdueCount: number;
  weOweCents: number;
};

export function partnerBalance(docs: readonly PartnerDoc[], today: string): PartnerBalance {
  const out: PartnerBalance = { theyOweCents: 0, overdueCents: 0, overdueCount: 0, weOweCents: 0 };
  for (const d of docs) {
    const open = openCents(d.grossCents, d.settledCents, d.creditedCents);
    if (open <= 0) continue;
    if (d.kind === "bill") {
      out.weOweCents += open;
      continue;
    }
    out.theyOweCents += open;
    if (d.dueDate && d.dueDate < today) {
      out.overdueCents += open;
      out.overdueCount++;
    }
  }
  return out;
}
