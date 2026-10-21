import type { DocRule } from "./engine";

/** One row of the default rule book, every field not named taking the common default. */
export const rule = (
  code: string,
  step: string,
  doc: string,
  o: Partial<DocRule> & Pick<DocRule, "anchor" | "offset" | "party">,
): DocRule => ({
  code,
  step,
  doc,
  country: "*",
  pol: "*",
  kind: "export",
  role: "docs_clerk",
  workingDays: false,
  blocking: false,
  needs: [],
  active: true,
  ...o,
});
