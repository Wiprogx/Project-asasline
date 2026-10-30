/**
 * Postcodes (Settings › Countries › a country): a country with a list takes only its codes. The
 * list holds what the post writes; a code is compared without spaces or case, and a Dutch one by
 * its four digits ("1011 AB" is 1011).
 */
export type PostcodeOption = {
  code: string;
  place: string;
  cityId: string | null;
  city: string | null;
};

/** The code as the list holds it: "1011 ab" → "1011" in the Netherlands, "l-1009" → "L-1009". */
export function postcodeKey(country: string, zip: string): string {
  const z = zip.trim().toUpperCase().replace(/\s+/g, "");
  return country.toUpperCase() === "NL" ? z.slice(0, 4) : z;
}

/** "2600 Berchem": what a postcode suggestion shows. */
export const postcodeLabel = (o: Pick<PostcodeOption, "code" | "place">) => `${o.code} ${o.place}`;
