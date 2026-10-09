/**
 * What a paper must carry before it is good (legacy CHECKLISTS): a Settings table of lists,
 * each item ticked against the paper itself. A document step with a checklist is not closed by
 * a tick — the list is the close; anything left unticked becomes its own task and holds up
 * nothing else.
 */
export type ChecklistItem = { k: string; t: string; hint?: string };
export type Checklist = { key: string; label: string; items: ChecklistItem[] };

export const DEFAULT_CHECKLISTS: Checklist[] = [
  {
    key: "invoice",
    label: "Export invoice check",
    items: [
      {
        k: "name",
        t: "Headed Invoice — not a proforma",
        hint: "An invoice in any accepted language counts — Facture, Factuur, Rechnung. A proforma or a quote does not.",
      },
      { k: "date", t: "Invoice date" },
      {
        k: "parties",
        t: "Shipper, consignee and notify — full",
        hint: "Company, address, postcode, city, country · VAT if a company · passport no. and a copy if a person · phone and email",
      },
      { k: "goods", t: "Product, weight, quantity and price" },
      { k: "cont", t: "Container number" },
      { k: "seal", t: "Seal number" },
      {
        k: "inco",
        t: "Incoterm — CFR with the freight amount, or EXW",
        hint: "Gabon needs the freight value: it goes on the BIETC.",
      },
      {
        k: "freight",
        t: "Freight value stated somewhere",
        hint: "Inside the invoice if CFR, or a separate freight invoice if EXW.",
      },
    ],
  },
];

/** The items of a list not among the ticked ones. */
export const missingItems = (list: Checklist, ticked: readonly string[]) =>
  list.items.filter((i) => !ticked.includes(i.k));

/* ---- the Settings table, one item per line: "list | List label | item | Item text | hint" ---- */

export const checklistLines = (lists: readonly Checklist[]) =>
  lists
    .flatMap((l) => l.items.map((i) => [l.key, l.label, i.k, i.t, i.hint ?? ""].join(" | ")))
    .join("\n");

export function parseChecklistLines(text: string): { lists: Checklist[]; problems: string[] } {
  const lists: Checklist[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [key = "", label = "", k = "", t = "", hint = ""] = line
        .split("|")
        .map((x) => x.trim());
      if (!/^[a-z][a-z0-9_]{1,29}$/.test(key))
        problems.push(`Line ${i + 1}: a list key in small letters (invoice).`);
      else if (!label || label.length > 80) problems.push(`Line ${i + 1}: the list's label.`);
      else if (!/^[a-z][a-z0-9_]{0,29}$/.test(k))
        problems.push(`Line ${i + 1}: an item key in small letters (seal).`);
      else if (!t || t.length > 120) problems.push(`Line ${i + 1}: what must be on the paper.`);
      else if (hint.length > 300) problems.push(`Line ${i + 1}: a shorter hint.`);
      else {
        let list = lists.find((l) => l.key === key);
        if (!list) {
          list = { key, label, items: [] };
          lists.push(list);
        }
        if (list.items.some((x) => x.k === k))
          problems.push(`Line ${i + 1}: ${key} has ${k} twice.`);
        else list.items.push(hint ? { k, t, hint } : { k, t });
      }
    });
  return { lists, problems };
}
