"use client";

import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";
import { Button } from "@/components/ui/button";

export type CommodityDraft = { code: string; description: string | null };

/**
 * "Commodity (HS) — one row per product" (legacy hsRow): an HS code found by its digits or its
 * words in Settings › HS codes; a code the list lacks is taken as typed.
 */
export function CommodityRows({
  rows,
  set,
  hs,
}: {
  rows: CommodityDraft[];
  set: (rows: CommodityDraft[]) => void;
  hs: readonly PickerOption[];
}) {
  const put = (i: number, code: string | null) => {
    const known = hs.find((h) => h.value === code);
    set(
      rows.map((r, k) =>
        k === i ? { code: code ?? "", description: known ? known.label : r.description } : r,
      ),
    );
  };
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Commodity (HS) — one row per product</legend>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2">
          <span className="text-right text-sm text-muted-foreground tabular-nums">{i + 1}</span>
          <SearchPicker
            id={`hs-${i}`}
            name={`hs-${i}`}
            aria-label={`Commodity ${i + 1}`}
            options={hs}
            defaultValue={r.code || null}
            placeholder="Search code or product, e.g. 6309 or worn"
            limit={50}
            free
            onChange={(v) => put(i, v)}
          />
          {rows.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => set(rows.filter((_, k) => k !== i))}
            >
              Remove
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => set([...rows, { code: "", description: null }])}
        >
          + Add HS code
        </Button>
      </div>
    </fieldset>
  );
}
