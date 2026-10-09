/**
 * The quotation as the customer reads it (legacy quoteDoc). Itemized lists each line with its
 * price; all-inclusive gives one price per destination and names only the services chosen to
 * be listed. The choice is the quotation's, and the document obeys it. Declined destinations
 * are left out.
 */
export const QUOTATION_DISPLAYS = ["itemized", "inclusive"] as const;
export type QuotationDisplay = (typeof QUOTATION_DISPLAYS)[number];
export const QUOTATION_DISPLAY_LABEL: Record<QuotationDisplay, string> = {
  itemized: "Itemized",
  inclusive: "All-inclusive",
};

export type DocLine = {
  description: string;
  qty: number;
  sellCents: number | null;
  listed: boolean;
  /** Multiplied by the destination's containers (legacy: a line with no box applies to every box). */
  perBox: boolean;
  /** A term (free time), named on the paper and never totalled. */
  condition: boolean;
};

export type DocRoute = {
  pol: string;
  pod: string;
  finalPlace: string | null;
  containerType: string | null;
  /** How many containers the destination is quoted for. */
  boxes: number;
  declined: boolean;
  lines: readonly DocLine[];
};

export type QuotationDoc = {
  routes: {
    title: string;
    /** `term`: a free-time condition, named on the paper and never totalled. */
    lines: { text: string; amountCents: number | null; term: boolean }[];
    totalCents: number;
  }[];
  totalCents: number;
};

/** What one line adds: per container it is multiplied by the boxes; a term adds nothing. */
export const lineAmount = (
  l: Pick<DocLine, "qty" | "sellCents" | "perBox" | "condition">,
  boxes: number,
) => (l.condition ? 0 : (l.sellCents ?? 0) * l.qty * (l.perBox ? Math.max(1, boxes) : 1));

const lineTotal = (l: DocLine, boxes: number) => lineAmount(l, boxes);
const lineText = (l: DocLine, boxes: number) =>
  `${l.qty > 1 ? `${l.qty} × ` : ""}${l.description}${
    l.condition ? " — terms" : l.perBox && boxes > 1 ? ` · per container` : ""
  }`;

/** The destination's sell and cost, the legacy routeSell: unit lines × boxes + the lines counted once. */
export function routeTotals(r: {
  boxes: number;
  lines: readonly (Pick<DocLine, "qty" | "sellCents" | "perBox" | "condition"> & {
    costCents?: number | null;
  })[];
}) {
  return {
    sell: r.lines.reduce((s, l) => s + lineAmount(l, r.boxes), 0),
    cost: r.lines.reduce(
      (s, l) => s + lineAmount({ ...l, sellCents: l.costCents ?? 0 }, r.boxes),
      0,
    ),
  };
}

export function routeTitle(r: Omit<DocRoute, "lines" | "declined">): string {
  const box = r.containerType ? ` · ${r.containerType}` : "";
  const n = r.boxes > 1 ? ` × ${r.boxes}` : "";
  const final = r.finalPlace ? ` · to ${r.finalPlace}` : "";
  return `${r.pol} › ${r.pod}${box}${n}${final}`;
}

export function quotationDoc(routes: readonly DocRoute[], display: QuotationDisplay): QuotationDoc {
  const docRoutes = routes
    .filter((r) => !r.declined)
    .map((r) => ({
      title: routeTitle(r),
      lines:
        display === "itemized"
          ? r.lines.map((l) => ({
              text: lineText(l, r.boxes),
              amountCents: l.condition ? null : lineTotal(l, r.boxes),
              term: l.condition,
            }))
          : r.lines
              .filter((l) => l.listed)
              .map((l) => ({ text: lineText(l, r.boxes), amountCents: null, term: l.condition })),
      totalCents: r.lines.reduce((s, l) => s + lineTotal(l, r.boxes), 0),
    }));
  return { routes: docRoutes, totalCents: docRoutes.reduce((s, r) => s + r.totalCents, 0) };
}

/** The destinations in one phrase, for a subject line: "BEANR › CMDLA · 40HC and 1 more". */
export function destinationsPhrase(doc: QuotationDoc): string {
  const [first, ...rest] = doc.routes;
  if (!first) return "—";
  return rest.length ? `${first.title} and ${rest.length} more` : first.title;
}

/** The quotation in a few lines of a letter: each destination and its price. */
export function letterLines(doc: QuotationDoc, money: (cents: number) => string): string {
  return doc.routes
    .map((r) =>
      [
        `${r.title}: ${money(r.totalCents)}`,
        ...r.lines.map(
          (l) => `  · ${l.text}${l.amountCents === null ? "" : ` ${money(l.amountCents)}`}`,
        ),
      ].join("\n"),
    )
    .join("\n\n");
}
