/**
 * Cities (Settings › Countries › a country): a contact's city is a row of its country's list,
 * picked, never typed, so the same town is never written three ways.
 */
export type CityOption = { id: string; name: string; region: string | null; aliases: string[] };

/** Words as a search reads them: no accents, no case, letters and digits only ("Liège" = "liege"). */
export const cityKey = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** What a city row is searched by: its name, its other names and its region. */
export const citySearchKey = (c: {
  name: string;
  aliases: readonly string[];
  region?: string | null;
}) => cityKey([c.name, ...c.aliases, c.region ?? ""].join(" "));

/** "Saint-Denis (Réunion)": the region tells two cities of one name apart. */
export const cityLabel = (c: { name: string; region?: string | null }) =>
  c.region && c.region !== c.name ? `${c.name} (${c.region})` : c.name;
