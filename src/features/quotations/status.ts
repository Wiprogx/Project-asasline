import type { QuotationStatus, Tone } from "@/domain/shipments";

export const QUOTATION_TONE: Record<QuotationStatus, [label: string, tone: Tone]> = {
  draft: ["Draft", "neutral"],
  sent: ["Sent", "warning"],
  accepted: ["Accepted", "success"],
  declined: ["Declined", "danger"],
  cancelled: ["Cancelled", "neutral"],
};
