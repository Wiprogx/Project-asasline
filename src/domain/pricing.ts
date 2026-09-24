/**
 * The rate catalogue and customer agreements (legacy RATE_ITEMS, PRICE_LISTS, priceFor).
 * Every chargeable thing is one catalogue item with a buy and a sell price; a customer may
 * hold an agreed price per item for a period. A quotation line is priced
 *   agreement → (the contact says so) the last price quoted → catalogue.
 */

/** Seed for the `rateCategories` Settings table; the running app reads the table. */
export const DEFAULT_RATE_CATEGORIES = [
  { code: "ocean", label: "Ocean freight", salesAccount: "700000", purchaseAccount: "604000" },
  { code: "inland", label: "Inland transport", salesAccount: "700100", purchaseAccount: "604100" },
  {
    code: "customs",
    label: "Customs clearance",
    salesAccount: "700200",
    purchaseAccount: "604200",
  },
  { code: "docs", label: "Country document", salesAccount: "700300", purchaseAccount: "604300" },
  { code: "vgm", label: "VGM / weighing", salesAccount: "700300", purchaseAccount: "604400" },
  {
    code: "freetime",
    label: "Free time & charges",
    salesAccount: "700500",
    purchaseAccount: "604600",
  },
  { code: "other", label: "Other services", salesAccount: "700400", purchaseAccount: "604500" },
] as const;

export type RateCategory = {
  code: string;
  label: string;
  salesAccount: string;
  purchaseAccount: string;
};

export const RATE_TYPES = ["contract", "spot"] as const;
export type RateType = (typeof RATE_TYPES)[number];
export const RATE_TYPE_LABEL: Record<RateType, string> = {
  contract: "Contract",
  spot: "Spot",
};

export const PRICE_SOURCES = ["agreement", "last", "catalogue", "manual"] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];
export const PRICE_SOURCE_LABEL: Record<PriceSource, string> = {
  agreement: "Agreed",
  last: "Last price",
  catalogue: "Catalogue",
  manual: "Typed",
};

export type RateItemFields = {
  category: string;
  name: string | null;
  pol: string | null;
  pod: string | null;
  containerType: string | null;
  carrier: string | null;
  fromPlace: string | null;
  toPlace: string | null;
  docCode: string | null;
  country: string | null;
  freeDays: number | null;
};

const q = (v: string | null) => v ?? "?";
const box = (it: RateItemFields) => (it.containerType ? ` · ${it.containerType}` : "");
const LABELS: Record<string, (it: RateItemFields) => string> = {
  ocean: (it) => `${q(it.pol)} › ${q(it.pod)}${box(it)}${it.carrier ? ` · ${it.carrier}` : ""}`,
  inland: (it) => `${q(it.fromPlace)} › ${q(it.toPlace)}${box(it)}`,
  docs: (it) => `${q(it.docCode)} — ${q(it.country)}`,
  freetime: (it) => `${it.name ?? "Free time"} · ${it.freeDays ?? 0} free days`,
};

/** How an item reads in a picker and on a quotation line (legacy itemLabel). */
export function itemLabel(it: RateItemFields): string {
  return LABELS[it.category]?.(it) ?? it.name ?? "(unnamed)";
}

type Need = [fields: (keyof RateItemFields)[], problem: string];
const NEEDS: Record<string, Need> = {
  ocean: [["pol", "pod"], "An ocean leg needs its port of loading and discharge."],
  inland: [["fromPlace", "toPlace"], "An inland move needs where from and where to."],
  docs: [["docCode", "country"], "A country document needs its code and its country."],
  freetime: [["name", "freeDays"], "Free time needs a name and its free days."],
};

/** What each category needs before it can be priced on a quotation; null when complete. */
export function itemProblem(it: RateItemFields): string | null {
  const [fields, problem] = NEEDS[it.category] ?? [["name"], "Give the item a name."];
  return fields.every((f) => it[f] !== null && it[f] !== "") ? null : problem;
}

type Dated = { validFrom: string | null; validUntil: string | null };

/**
 * An agreement is live only when BOTH ends contain the day (legacy 2.3: a list written to
 * open next January was returned as today's price, and silently outranked the catalogue).
 */
export function listIsLive(list: Dated & { active: boolean }, day: string): boolean {
  return (
    list.active &&
    (!list.validFrom || list.validFrom <= day) &&
    (!list.validUntil || list.validUntil >= day)
  );
}

/** Two periods share at least one day; an open end runs forever. */
export function periodsOverlap(a: Dated, b: Dated): boolean {
  const startsBeforeBEnds = !a.validFrom || !b.validUntil || a.validFrom <= b.validUntil;
  const bStartsBeforeAEnds = !b.validFrom || !a.validUntil || b.validFrom <= a.validUntil;
  return startsBeforeBEnds && bStartsBeforeAEnds;
}

export type QuotedPrice = { sellCents: number; buyCents: number; ref: string; day: string };

/** The latest price this customer was quoted for the item, ignoring zero prices (12.6). */
export function latestQuoted(candidates: readonly QuotedPrice[]): QuotedPrice | null {
  let best: QuotedPrice | null = null;
  for (const c of candidates)
    if (c.sellCents > 0 && (!best || c.day > best.day || (c.day === best.day && c.ref > best.ref)))
      best = c;
  return best;
}

export type Price = {
  sellCents: number;
  buyCents: number;
  source: PriceSource;
  /** The agreement's name, or the quotation the last price came from. */
  from: string | null;
};

/**
 * The price of an item for a customer (legacy priceFor): the live agreement wins; a contact
 * set to "last price" is quoted what it was quoted last (the cost stays the catalogue's);
 * otherwise the catalogue.
 */
export function priceFor(input: {
  item: { sellCents: number; buyCents: number };
  agreed: { sellCents: number; buyCents: number; listName: string } | null;
  usesLastPrice: boolean;
  last: QuotedPrice | null;
}): Price {
  const { item, agreed, usesLastPrice, last } = input;
  if (agreed)
    return {
      sellCents: agreed.sellCents,
      buyCents: agreed.buyCents,
      source: "agreement",
      from: agreed.listName,
    };
  if (usesLastPrice && last)
    return {
      sellCents: last.sellCents,
      buyCents: item.buyCents || last.buyCents,
      source: "last",
      from: last.ref,
    };
  return { sellCents: item.sellCents, buyCents: item.buyCents, source: "catalogue", from: null };
}
