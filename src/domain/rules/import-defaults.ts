import type { DocRule } from "./engine";
import { rule as r } from "./rule-row";

/** The default rule book's import half (legacy DOC_RULES, kind "Import"); see defaults.ts. */
export const IMPORT_RULES: DocRule[] = [
  // — Import (every origin), anchored on the arrival —
  r("IMP_DOCS", "Get the supplier invoice and packing list", "Supplier invoice and packing list", {
    party: "customer",
    anchor: "eta",
    offset: -10,
    kind: "import",
    blocking: true,
  }),
  r(
    "IMP_BL",
    "Receive the B/L or the telex release from the carrier",
    "Bill of lading or telex release",
    { party: "carrier", anchor: "eta", offset: -7, kind: "import", blocking: true },
  ),
  r("IMP_CHECK", "Check the import file before it goes to the broker", "Import file checked", {
    party: "internal",
    anchor: "eta",
    offset: -7,
    kind: "import",
    needs: ["IMP_DOCS"],
  }),
  r(
    "IMP_TOCUSTOMS",
    "Send the import file to the customs broker",
    "File sent to the customs broker",
    {
      party: "customs",
      anchor: "eta",
      offset: -3,
      workingDays: true,
      kind: "import",
      needs: ["IMP_CHECK", "IMP_BL"],
    },
  ),
  r("IMP_DECL", "Receive the import declaration", "Import declaration (IM-A)", {
    party: "customs",
    anchor: "eta",
    offset: 0,
    kind: "import",
    blocking: true,
    needs: ["IMP_TOCUSTOMS"],
  }),
  r("IMP_RELEASE", "Get the container released", "Container released by the carrier", {
    party: "carrier",
    anchor: "eta",
    offset: 0,
    kind: "import",
    blocking: true,
    needs: ["IMP_BL", "IMP_DECL"],
  }),
  r("IMP_DELIVERY", "Arrange the delivery to the customer", "Delivery to the customer", {
    party: "internal",
    anchor: "eta",
    offset: 1,
    kind: "import",
    needs: ["IMP_RELEASE"],
  }),
  r("IMP_DOCS_OUT", "Send the final documents to the customer", "Final documents to the customer", {
    need: "send",
    party: "customer",
    anchor: "eta",
    offset: 3,
    kind: "import",
    needs: ["IMP_DELIVERY"],
  }),
];
