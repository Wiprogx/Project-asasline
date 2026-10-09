/**
 * Small lookups the legacy app kept as editable tables (WITHDRAW_REASONS, PROFESSIONS,
 * BOX_OWNERS, CONTAINER_TARE / CONTAINER_MAX): each is a Settings table now; these are the
 * defaults and the one or two readings they need.
 */
export const DEFAULT_WITHDRAW_REASONS = [
  "No longer needed",
  "Done outside the system",
  "Duplicate",
  "Wrong shipment",
  "Other",
];

/** The trades a contact is in: the five a booking picks its parties from, then what the cargo is. */
export const DEFAULT_PROFESSIONS = [
  "Freight forwarder",
  "Transporter",
  "Carrier",
  "Forwarder",
  "Customs",
  "Terminal / depot",
  "Warehousing",
  "Insurance",
  "Inspection & survey",
  "Fumigation",
  "Container repair",
  "Ship agency",
  "Lashing & securing",
  "Weighing (VGM)",
  "Bank / finance",
  "Agricultural products",
  "Apparel",
  "Auto parts",
  "Automotive / vehicles",
  "Bags & luggage",
  "Batteries",
  "Beverages",
  "Building materials",
  "Cables & wiring",
  "Ceramics & tiles",
  "Chemicals",
  "Coffee & tea",
  "Confectionery",
  "Construction equipment",
  "Consumer electronics",
  "Cosmetics & perfume",
  "Dairy products",
  "Detergents & cleaning",
  "Electronics",
  "Farm machinery",
  "Fertilisers",
  "Fish & seafood",
  "Foodstuffs",
  "Footwear",
  "Frozen goods",
  "Fruit & vegetables",
  "Furniture",
  "General trading",
  "Generators",
  "Glassware",
  "Hardware & tools",
  "Home appliances",
  "Household goods",
  "Industrial machinery",
  "IT equipment",
  "Leather goods",
  "Lubricants & oils",
  "Marble & granite",
  "Medical supplies",
  "Metals & scrap",
  "Mobile phones",
  "Packaging materials",
  "Paint & coatings",
  "Paper & cardboard",
  "Personal effects / removals",
  "Pharmaceuticals",
  "Plastics & resins",
  "Printing supplies",
  "Rice & grains",
  "Rubber & tyres",
  "Sanitary ware",
  "Seeds",
  "Solar equipment",
  "Spare parts",
  "Sports goods",
  "Stationery",
  "Steel products",
  "Sugar",
  "Textiles",
  "Timber & wood",
  "Tobacco",
  "Toys",
  "Used clothing",
  "Used tyres",
  "Used vehicles",
  "Vegetable oil",
  "Water treatment equipment",
  "Wheat & flour",
];

/** "Transporter, Used clothing" typed on the form → the list kept on the contact, each once. */
export const parseProfessions = (text: string | null | undefined): string[] => [
  ...new Set(
    (text ?? "")
      .split(/[,\n;]/)
      .map((p) => p.trim())
      .filter(Boolean),
  ),
];

export type BoxOwner = { prefix: string; owner: string };

/** The owner of a container by the four letters of its number (legacy BOX_OWNERS, ownerOf). */
export const DEFAULT_BOX_OWNERS: BoxOwner[] = (
  [
    ["MSCU", "MSC"],
    ["MSBU", "MSC"],
    ["MEDU", "MSC"],
    ["MSDU", "MSC"],
    ["MAEU", "Maersk"],
    ["MSKU", "Maersk"],
    ["MRKU", "Maersk"],
    ["MMAU", "Maersk"],
    ["CMAU", "CMA CGM"],
    ["ECMU", "CMA CGM"],
    ["CGMU", "CMA CGM"],
    ["APZU", "CMA CGM"],
    ["HLXU", "Hapag-Lloyd"],
    ["HLBU", "Hapag-Lloyd"],
    ["UACU", "Hapag-Lloyd"],
    ["HMMU", "HMM"],
    ["HDMU", "HMM"],
    ["COSU", "COSCO"],
    ["CBHU", "COSCO"],
    ["CCLU", "COSCO"],
    ["OOLU", "OOCL"],
    ["OOCU", "OOCL"],
    ["ONEU", "ONE"],
    ["EGHU", "Evergreen"],
    ["EISU", "Evergreen"],
    ["EMCU", "Evergreen"],
    ["YMLU", "Yang Ming"],
    ["ZIMU", "ZIM"],
    ["TCLU", "Triton (leased)"],
    ["TCNU", "Triton (leased)"],
    ["TGHU", "Textainer (leased)"],
    ["CAIU", "CAI (leased)"],
    ["SEGU", "Seaco (leased)"],
    ["BMOU", "Beacon (leased)"],
    ["FCIU", "Florens (leased)"],
    ["GESU", "GE Seaco (leased)"],
  ] as const
).map(([prefix, owner]) => ({ prefix, owner }));

export function ownerOf(
  owners: readonly BoxOwner[],
  number: string | null | undefined,
): string | null {
  const prefix = (number ?? "").toUpperCase().slice(0, 4);
  return owners.find((o) => o.prefix === prefix)?.owner ?? null;
}

export const boxOwnerLines = (owners: readonly BoxOwner[]) =>
  owners.map((o) => `${o.prefix} | ${o.owner}`).join("\n");

export function parseBoxOwnerLines(text: string): { owners: BoxOwner[]; problems: string[] } {
  const owners: BoxOwner[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [prefix = "", owner = ""] = line.split("|").map((x) => x.trim());
      const p = prefix.toUpperCase();
      if (!/^[A-Z]{4}$/.test(p)) problems.push(`Line ${i + 1}: four letters (MSCU).`);
      else if (!owner || owner.length > 60) problems.push(`Line ${i + 1}: the owner's name.`);
      else if (owners.some((o) => o.prefix === p)) problems.push(`Line ${i + 1}: ${p} twice.`);
      else owners.push({ prefix: p, owner });
    });
  return { owners, problems };
}

export type ContainerSpec = { type: string; tareKg: number; maxGrossKg: number };

/** `type | tare kg | max gross kg` (legacy CONTAINER_TARE / CONTAINER_MAX). */
export const containerSpecLines = (specs: readonly ContainerSpec[]) =>
  specs.map((s) => `${s.type} | ${s.tareKg} | ${s.maxGrossKg}`).join("\n");

export function parseContainerSpecLines(text: string): {
  specs: ContainerSpec[];
  problems: string[];
} {
  const specs: ContainerSpec[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [type = "", tare = "", max = ""] = line.split("|").map((x) => x.trim());
      const t = type.toUpperCase();
      const tareKg = Number(tare);
      const maxGrossKg = Number(max);
      if (!/^[A-Z0-9]{2,10}$/.test(t)) problems.push(`Line ${i + 1}: an ISO type (40HC).`);
      else if (!Number.isInteger(tareKg) || tareKg <= 0 || tareKg > 20_000)
        problems.push(`Line ${i + 1}: the tare in whole kilograms.`);
      else if (!Number.isInteger(maxGrossKg) || maxGrossKg <= tareKg || maxGrossKg > 100_000)
        problems.push(`Line ${i + 1}: the maximum gross in whole kilograms, above the tare.`);
      else if (specs.some((s) => s.type === t)) problems.push(`Line ${i + 1}: ${t} twice.`);
      else specs.push({ type: t, tareKg, maxGrossKg });
    });
  return { specs, problems };
}

/** The specs as domain/container's vgm reads them: by type. */
export const specsByType = (specs: readonly ContainerSpec[]) =>
  Object.fromEntries(specs.map((s) => [s.type, { tareKg: s.tareKg, maxGrossKg: s.maxGrossKg }]));
