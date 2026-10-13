/**
 * The two sides of a shipment that goes both ways (legacy sidesOf, the "EXPORT Doc." and
 * "IMPORT Doc." tabs): each side shows the papers of its own rules and of the rules for any
 * direction. The destination country's papers travel with the export.
 */
export type Side = "export" | "import";
export type RuleKind = Side | "*";

export const SIDES: readonly Side[] = ["export", "import"];
export const SIDE_LABEL: Record<Side, string> = {
  export: "Export papers",
  import: "Import papers",
};

export const parseSide = (v: unknown): Side => (v === "import" ? "import" : "export");

/** A rule's step belongs to this side when it is for that direction or for any. */
export const onSide = (kind: RuleKind, side: Side) => kind === "*" || kind === side;

/** The direction a paper comes from: its rule's, or the export's for a destination paper. */
export function kindOfPaper(
  paper: { code: string; source: "destination" | "step" },
  ruleKinds: Readonly<Record<string, RuleKind>>,
): RuleKind {
  if (paper.source === "destination") return "export";
  return ruleKinds[paper.code.split("#")[0]] ?? "*";
}
