/**
 * What a supplier's line turned out to be (legacy BOOKS.lineMem): the cost account the office
 * booked it on, remembered per supplier under the words of the line with the changing parts
 * taken out — the month, the number, the date — so next time the same line is filled in.
 */
export function memoryKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d[\d./-]*/g, " ")
    .replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|januari|februari|maart|mei|augustus|oktober)\b/g,
      " ",
    )
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 80);
}

export type LineMemory = { key: string; account: string };

/** The account remembered for a line's words, or null when the office never booked one like it. */
export function rememberedAccount(
  memory: readonly LineMemory[],
  description: string,
): string | null {
  const key = memoryKey(description);
  if (!key) return null;
  return memory.find((m) => m.key === key)?.account ?? null;
}
