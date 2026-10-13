/**
 * Everyone on a booking, in one list (legacy BF registry and its option lists): the trade parties
 * the papers name, and the office's own counterparts on the file. Every screen and rule that asks
 * "who is on this shipment" reads this list, so a new party is added here once.
 */
export type PartyMatch = { professions?: readonly string[]; tags?: readonly string[] };

export type PartyDef = {
  key: BookingPartyKey;
  label: string;
  /** What the role is for, shown under the picker. */
  hint?: string;
  /** Contacts offered first (legacy roleOptions: by industry, then by tag); the rest follow. */
  match?: PartyMatch;
  /** May receive the shipment's invoice (legacy BILLABLE). */
  billable?: boolean;
};

export const TRADE_PARTIES = [
  { key: "clientId", label: "Customer", billable: true },
  { key: "payerId", label: "Payer", billable: true },
  { key: "shipperId", label: "Shipper", billable: true },
  { key: "consigneeId", label: "Consignee", billable: true },
  { key: "notifyId", label: "Notify party", billable: true },
] as const;

export const OFFICE_PARTIES = [
  {
    key: "docCheckId",
    label: "Doc check",
    hint: "Who checks the papers before they go out; tracking news goes to them. Tag a contact Doc Check to list it first.",
    match: { tags: ["Doc Check"] },
  },
  {
    key: "shippingCoId",
    label: "Shipping line",
    hint: "The line the box is booked with — it may differ from the one priced on the quotation.",
    match: { professions: ["Carrier", "Company carrier"], tags: ["Company carrier"] },
  },
  {
    key: "transporterId",
    label: "Transporter / trucker",
    hint: "The trucker by default; each container may name its own.",
    match: { professions: ["Transporter", "Road transport"], tags: ["Trucking"] },
  },
  {
    key: "destForwarderId",
    label: "Destination forwarder",
    hint: "The consignee's office: sends the shipping instructions and confirms the draft B/L.",
    match: { professions: ["Freight forwarder"] },
  },
  {
    key: "forwarderId",
    label: "Forwarder",
    match: { professions: ["Forwarder", "Freight forwarder"], tags: ["Forwarder"] },
  },
  {
    key: "customsAgentId",
    label: "Customs agent",
    hint: "The declarant or broker.",
    match: { professions: ["Customs", "Customs brokerage"], tags: ["Customs"] },
  },
] as const;

export type TradePartyKey = (typeof TRADE_PARTIES)[number]["key"];
export type OfficePartyKey = (typeof OFFICE_PARTIES)[number]["key"];
export type BookingPartyKey = TradePartyKey | OfficePartyKey;

export const BOOKING_PARTIES: readonly PartyDef[] = [...TRADE_PARTIES, ...OFFICE_PARTIES];
export const PARTY_KEYS: readonly BookingPartyKey[] = BOOKING_PARTIES.map((p) => p.key);
export const BILLABLE_KEYS: readonly BookingPartyKey[] = BOOKING_PARTIES.filter(
  (p) => p.billable,
).map((p) => p.key);

type Candidate = {
  id: string;
  name: string;
  professions?: string[] | null;
  tags?: string[] | null;
};

const lower = (xs: readonly string[] | null | undefined) => (xs ?? []).map((x) => x.toLowerCase());

/** Whether a contact fits the role: one of its industries, or one of its tags. */
export function fits(c: Candidate, m: PartyMatch | undefined): boolean {
  if (!m) return false;
  const profs = lower(c.professions);
  const tags = lower(c.tags);
  return (
    lower(m.professions).some((p) => profs.includes(p)) ||
    lower(m.tags).some((t) => tags.includes(t))
  );
}

/** The picker's options: the contacts that fit first, then everyone else, each by name. */
export function partyOptions(
  contacts: readonly Candidate[],
  m: PartyMatch | undefined,
): { value: string; label: string }[] {
  const byName = (a: Candidate, b: Candidate) => a.name.localeCompare(b.name);
  const first = contacts.filter((c) => fits(c, m)).sort(byName);
  const rest = contacts.filter((c) => !fits(c, m)).sort(byName);
  return [...first, ...rest].map((c) => ({ value: c.id, label: c.name }));
}

/** The ids of everyone on a booking, each once. */
export function partyIds(b: Partial<Record<BookingPartyKey, string | null>>): string[] {
  return [...new Set(PARTY_KEYS.map((k) => b[k]).filter((v): v is string => !!v))];
}

/** Who the tracking news goes to (legacy autoSend: b.docCheck || b.client). */
export const newsRecipientId = (b: { docCheckId?: string | null; clientId: string }) =>
  b.docCheckId || b.clientId;
