import type { Holiday } from "./calendar";
import type { DocRule } from "./engine";

/**
 * The legacy rule book (demo.html DOC_RULES), ported as the default for the `docRules`
 * Settings table. Once Settings saves the table, the saved rows win.
 *
 * Not ported yet — they need modules that are not migrated: CERTIWEIGHT (per-container and
 * "between" anchor), RELEASE_OK (release mode on the quotation), the "sold on the quotation"
 * filter and the weights-ready check on VGM. Loading ports use UN/LOCODEs (Rotterdam NLRTM,
 * Leixões PTLEI) instead of the legacy port names.
 */
const r = (
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

export const DEFAULT_RULES: DocRule[] = [
  // — Export, every destination —
  r("ASK_INV", "Request the export invoice from the customer", "Export invoice requested", {
    party: "customer",
    anchor: "customs",
    offset: -2,
  }),
  r("INVOICE", "Get the export invoice from the customer", "Export invoice", {
    party: "customer",
    anchor: "customs",
    offset: 0,
    needs: ["ASK_INV"],
  }),
  r("INV_CUSTOMS", "Send the export invoice to customs", "Export invoice sent to customs", {
    party: "customs",
    anchor: "customs",
    offset: -1,
    needs: ["INVOICE"],
  }),
  r("EXA", "Receive the export declaration", "Export declaration (EX-A)", {
    party: "customs",
    anchor: "customs",
    offset: 0,
    needs: ["INV_CUSTOMS"],
    blocking: true,
  }),
  r("EXA", "Receive the export declaration — before loading", "Export declaration (EX-A)", {
    party: "customs",
    anchor: "loading",
    offset: -1,
    needs: ["INV_CUSTOMS"],
    blocking: true,
    pol: "NLRTM",
    note: "Rotterdam does not gate a loaded box in without the EX-1.",
  }),
  r("EXA", "Receive the export declaration — before loading", "Export declaration (EX-A)", {
    party: "customs",
    anchor: "loading",
    offset: -1,
    needs: ["INV_CUSTOMS"],
    blocking: true,
    pol: "PTLEI",
  }),
  r("VGM", "Confirm the VGM was sent to the carrier", "VGM sent to the carrier", {
    party: "carrier",
    anchor: "vgm",
    offset: 0,
    blocking: true,
    note: "Cargo weight + tare, straight off the containers.",
  }),
  r("LOADING", "Confirm the container was loaded", "Container loaded", {
    party: "internal",
    anchor: "loading",
    offset: 0,
  }),
  r("SI", "Send the shipping instruction", "Shipping instruction", {
    party: "carrier",
    anchor: "si",
    offset: 0,
    needs: ["VGM"],
    blocking: true,
    note: "After the VGM — the line wants the weight before the instruction.",
  }),
  r("BL_DRAFT", "Receive the draft {docName}", "Draft {docName}", {
    party: "carrier",
    anchor: "si",
    offset: 0,
    needs: ["SI"],
  }),
  r("BL_SEND", "Send the draft {docName} for confirmation", "Draft {docName} sent for approval", {
    party: "consignee",
    anchor: "etd",
    offset: -3,
    needs: ["BL_DRAFT"],
  }),
  r("BL_OK", "Confirm the {docName}", "{docName} confirmed", {
    party: "consignee",
    anchor: "etd",
    offset: 0,
    needs: ["BL_SEND"],
  }),
  r("TERMINAL", "Confirm the container is at the terminal", "Container at the terminal", {
    party: "internal",
    anchor: "portcut",
    offset: 0,
    blocking: true,
  }),
  r("SAILED", "Confirm the vessel sailed", "Vessel sailed", {
    party: "internal",
    anchor: "etd",
    offset: 0,
    kind: "*",
  }),
  r("TELL_SAILED", "Tell the customer the vessel sailed", "Customer told about the departure", {
    party: "customer",
    anchor: "etd",
    offset: 0,
    kind: "*",
    needs: ["SAILED"],
  }),
  r(
    "FINAL_BL_CUST",
    "Send the final {docName} to the customer",
    "Final {docName} to the customer",
    {
      party: "customer",
      anchor: "eta",
      offset: -3,
      kind: "*",
      active: false,
      note: "Off until accounting is in — it travels with our invoice.",
    },
  ),

  // — Gabon —
  r("BIETC_NO", "Request the BIETC number", "BIETC number", {
    party: "waiver",
    anchor: "loading",
    offset: -1,
    country: "GA",
    note: "The number has to be on the B/L.",
  }),
  r("BIETC_FILE", "Upload the BIETC file to the waiver site", "BIETC file uploaded", {
    party: "internal",
    anchor: "etd",
    offset: -2,
    workingDays: true,
    country: "GA",
    blocking: true,
    needs: ["BIETC_NO", "INVOICE", "EXA", "VGM", "SI", "BL_OK", "TERMINAL"],
  }),
  r("BIETC_DRAFT", "Approve the BIETC draft", "BIETC draft", {
    party: "waiver",
    anchor: "etd",
    offset: 7,
    country: "GA",
    needs: ["BIETC_FILE"],
  }),
  r("BL_FINAL_OUT", "Send the final {docName} to the waiver office", "Final {docName} sent", {
    party: "waiver",
    anchor: "eta",
    offset: -10,
    country: "GA",
  }),
  r("BIETC_FINAL", "Receive the final BIETC", "BIETC final", {
    party: "waiver",
    anchor: "eta",
    offset: -3,
    country: "GA",
    needs: ["BL_FINAL_OUT"],
  }),

  // — Egypt —
  r("ACID", "Request the ACID number from the consignee", "ACID number", {
    party: "consignee",
    anchor: "si",
    offset: -2,
    country: "EG",
    note: "No ACID, no B/L — Egyptian customs rejects the manifest without it.",
  }),

  // — Cameroon —
  r(
    "INV_BESC",
    "Get the second invoice — the one the BESC and the B/L follow",
    "Invoice for the BESC and the B/L",
    {
      party: "customer",
      anchor: "etd",
      offset: -1,
      country: "CM",
      note: "Not the customs invoice — different shipper name and wording.",
    },
  ),
  r("BESC_FILE", "Upload the BESC file", "BESC file uploaded", {
    party: "internal",
    anchor: "eta",
    offset: -7,
    country: "CM",
    needs: ["INV_BESC", "BL_OK"],
  }),

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
    party: "customer",
    anchor: "eta",
    offset: 3,
    kind: "import",
    needs: ["IMP_DELIVERY"],
  }),
];

/** Legacy HOLIDAYS (2026). Editable in Settings › Holidays. */
export const DEFAULT_HOLIDAYS: Holiday[] = [
  { country: "BE", date: "2026-01-01", name: "New Year" },
  { country: "BE", date: "2026-04-06", name: "Easter Monday" },
  { country: "BE", date: "2026-05-01", name: "Labour Day" },
  { country: "BE", date: "2026-05-14", name: "Ascension" },
  { country: "BE", date: "2026-05-25", name: "Whit Monday" },
  { country: "BE", date: "2026-07-21", name: "National Day" },
  { country: "BE", date: "2026-08-15", name: "Assumption" },
  { country: "BE", date: "2026-11-01", name: "All Saints" },
  { country: "BE", date: "2026-11-11", name: "Armistice" },
  { country: "BE", date: "2026-12-25", name: "Christmas" },
  { country: "NL", date: "2026-04-27", name: "King's Day" },
  { country: "NL", date: "2026-05-05", name: "Liberation Day" },
  { country: "FR", date: "2026-07-14", name: "Bastille Day" },
  { country: "GA", date: "2026-08-17", name: "Independence Day — Gabon" },
  { country: "CM", date: "2026-05-20", name: "National Day — Cameroon" },
  { country: "EG", date: "2026-07-23", name: "Revolution Day — Egypt" },
];
