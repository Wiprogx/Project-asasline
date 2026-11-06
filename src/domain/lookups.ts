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

/** "Transporter, Used clothing" typed on the form → the list kept on the record, each once. */
export const parseCommaList = (text: string | null | undefined): string[] => [
  ...new Set(
    (text ?? "")
      .split(/[,\n;]/)
      .map((p) => p.trim())
      .filter(Boolean),
  ),
];

export type BoxOwner = { prefix: string; owner: string };

/** The owner of a container by the four letters of its number (legacy BOX_OWNERS, ownerOf). */
export function ownerOf(
  owners: readonly BoxOwner[],
  number: string | null | undefined,
): string | null {
  const prefix = (number ?? "").toUpperCase().slice(0, 4);
  return owners.find((o) => o.prefix === prefix)?.owner ?? null;
}

/** A container type's empty weight and maximum gross (Settings › Lists › Container types). */
export type ContainerSpec = { type: string; tareKg: number; maxGrossKg: number };

/** The specs as domain/container's vgm reads them: by type, any case. */
export const specsByType = (specs: readonly ContainerSpec[]) =>
  Object.fromEntries(
    specs.map((s) => [s.type.toUpperCase(), { tareKg: s.tareKg, maxGrossKg: s.maxGrossKg }]),
  );
