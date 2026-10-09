import { VAT_CODES } from "./accounting";

/**
 * What a line of an invoice or a bill can be, besides a service of the catalogue (legacy
 * GL_ITEMS and SALE_ITEMS): the office's own costs — rent, software, fees — each with the
 * account it goes to and its VAT, and the few sales that are not a shipment. A Settings table
 * (invariant 8); these are the legacy defaults until saved.
 */
export const LINE_ITEM_KINDS = ["sale", "purchase"] as const;
export type LineItemKind = (typeof LINE_ITEM_KINDS)[number];

export type LineItem = {
  id: string;
  kind: LineItemKind;
  name: string;
  account: string;
  vat: string;
};

export const DEFAULT_LINE_ITEMS: readonly LineItem[] = [
  { id: "rent", kind: "purchase", name: "Office rent", account: "610000", vat: "S21" },
  { id: "it", kind: "purchase", name: "Software, IT and hosting", account: "611000", vat: "S21" },
  { id: "office", kind: "purchase", name: "Office supplies", account: "612000", vat: "S21" },
  {
    id: "fees",
    kind: "purchase",
    name: "Accountant and legal fees",
    account: "613000",
    vat: "S21",
  },
  { id: "tel", kind: "purchase", name: "Telephone and internet", account: "614000", vat: "S21" },
  { id: "car", kind: "purchase", name: "Vehicle costs", account: "617000", vat: "S21" },
  {
    id: "equip",
    kind: "purchase",
    name: "Computer or equipment (asset)",
    account: "230000",
    vat: "S21",
  },
  { id: "other", kind: "purchase", name: "Other costs", account: "619000", vat: "S21" },
  {
    id: "s_equip",
    kind: "sale",
    name: "Sale of equipment or a vehicle",
    account: "745000",
    vat: "S21",
  },
  {
    id: "s_other",
    kind: "sale",
    name: "Other income (not a shipment)",
    account: "740000",
    vat: "S21",
  },
];

export const itemsFor = (items: readonly LineItem[], kind: LineItemKind) =>
  items.filter((i) => i.kind === kind);

/** `id | kind | name | account | vat` — one item per line, as Settings edits them. */
export const lineItemLines = (items: readonly LineItem[]) =>
  items.map((i) => [i.id, i.kind, i.name, i.account, i.vat].join(" | ")).join("\n");

export function parseLineItemLines(text: string): { items: LineItem[]; problems: string[] } {
  const items: LineItem[] = [];
  const problems: string[] = [];
  const vats = new Set<string>(VAT_CODES.map((v) => v.code));
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [id = "", kind = "", name = "", account = "", vat = "S21"] = line
        .split("|")
        .map((x) => x.trim());
      if (!/^[a-z][a-z0-9_]{0,30}$/.test(id))
        problems.push(`Line ${i + 1}: an id in lowercase (rent).`);
      else if (!(LINE_ITEM_KINDS as readonly string[]).includes(kind))
        problems.push(`Line ${i + 1}: sale or purchase.`);
      else if (!name || name.length > 120)
        problems.push(`Line ${i + 1}: a name (up to 120 characters).`);
      else if (!/^\d{6}$/.test(account))
        problems.push(`Line ${i + 1}: a six-digit account (610000).`);
      else if (!vats.has(vat))
        problems.push(`Line ${i + 1}: a VAT code among ${[...vats].join(", ")}.`);
      else if (items.some((x) => x.id === id)) problems.push(`Line ${i + 1}: ${id} twice.`);
      else items.push({ id, kind: kind as LineItemKind, name, account, vat });
    });
  return { items, problems };
}

/** A catalogue item as the line picker needs it. */
export type RateChoice = {
  id: string;
  label: string;
  sellCents: number;
  buyCents: number;
  vatCode: string;
};

/** One choice of the picker: what it writes on the line. */
export type LineOption = {
  key: string;
  label: string;
  description: string;
  unitCents: number;
  vatCode: string;
  account: string;
};

/**
 * What a line can be (legacy itemOptions): the catalogue's services at their sell price on an
 * invoice, their buy price on a bill — booked as sales or as shipment costs — then the general
 * items of that kind at their own account.
 */
export function lineOptions(
  kind: LineItemKind,
  rates: readonly RateChoice[],
  items: readonly LineItem[],
): LineOption[] {
  const purchase = kind === "purchase";
  return [
    ...rates.map((r) => ({
      key: `r:${r.id}`,
      label: `${r.label} · catalogue`,
      description: r.label,
      unitCents: purchase ? r.buyCents : r.sellCents,
      vatCode: r.vatCode,
      account: purchase ? "604000" : "700000",
    })),
    ...itemsFor(items, kind).map((i) => ({
      key: `g:${i.id}`,
      label: `${i.name} · general`,
      description: i.name,
      unitCents: 0,
      vatCode: i.vat,
      account: i.account,
    })),
  ];
}
