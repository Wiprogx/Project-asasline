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

type DocLine = {
  description: string;
  qty: number;
  sellCents: number | null;
  listed: boolean;
};

type DocRoute = {
  pol: string;
  pod: string;
  finalPlace: string | null;
  containerType: string | null;
  declined: boolean;
  lines: readonly DocLine[];
};

export type QuotationDoc = {
  routes: {
    title: string;
    lines: { text: string; amountCents: number | null }[];
    totalCents: number;
  }[];
  totalCents: number;
};

const lineTotal = (l: DocLine) => (l.sellCents ?? 0) * l.qty;
const lineText = (l: DocLine) => `${l.qty > 1 ? `${l.qty} × ` : ""}${l.description}`;

export function routeTitle(r: Omit<DocRoute, "lines" | "declined">): string {
  const box = r.containerType ? ` · ${r.containerType}` : "";
  const final = r.finalPlace ? ` · to ${r.finalPlace}` : "";
  return `${r.pol} › ${r.pod}${box}${final}`;
}

export function quotationDoc(routes: readonly DocRoute[], display: QuotationDisplay): QuotationDoc {
  const docRoutes = routes
    .filter((r) => !r.declined)
    .map((r) => ({
      title: routeTitle(r),
      lines:
        display === "itemized"
          ? r.lines.map((l) => ({ text: lineText(l), amountCents: lineTotal(l) }))
          : r.lines.filter((l) => l.listed).map((l) => ({ text: lineText(l), amountCents: null })),
      totalCents: r.lines.reduce((s, l) => s + lineTotal(l), 0),
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
