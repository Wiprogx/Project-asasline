"use client";

import { useState } from "react";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatKg } from "@/domain/container";
import {
  cargoKgOf,
  type HsCode,
  type HsLine,
  hsLineText,
  packagesOf,
  parseHsLines,
} from "@/domain/goods";

export type BoxGoodsValues = {
  hsLines: HsLine[];
  cargoKg: number | null;
  packages: number | null;
  packageType: string | null;
  blDescription: string | null;
};

type Errors = Record<string, string[] | undefined> | undefined;

/**
 * Goods in this container (legacy HS lines): weight and packages per HS code, the totals
 * following as the lines are typed; what the shipper declared when there are no lines; and the
 * B/L description, printed word for word.
 */
export function BoxGoodsFields({
  p,
  box,
  hsCodes,
  packageTypes,
  fe,
}: {
  p: string;
  box: BoxGoodsValues;
  hsCodes: readonly HsCode[];
  packageTypes: readonly string[];
  fe: Errors;
}) {
  const [text, setText] = useState(hsLineText(box.hsLines));
  const parsed = parseHsLines(text);
  const totals = parsed.problem
    ? parsed.problem
    : parsed.lines.length
      ? `Totals from the lines: ${
          cargoKgOf({ ...box, hsLines: parsed.lines }) === null
            ? "no weight yet"
            : formatKg(cargoKgOf({ ...box, hsLines: parsed.lines }) ?? 0)
        } · ${packagesOf({ ...box, hsLines: parsed.lines }) ?? "?"} packages — they become the box's cargo weight and packages.`
      : "One per line: HS code | weight kg | packages | package type. Fill a line in and the box totals follow.";
  return (
    <fieldset className="grid gap-3 rounded-md border p-3 sm:col-span-2 lg:col-span-6 lg:grid-cols-4">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Goods in this container
      </legend>
      <Field
        id={`${p}-hs`}
        label="Weight and packages per HS code"
        className="lg:col-span-4"
        hint={totals}
        error={fe?.hsLines}
      >
        <Textarea
          id={`${p}-hs`}
          name="hsLines"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-sm"
          placeholder="630900 | 12000 | 620 | Bales"
        />
      </Field>
      <details className="text-xs text-muted-foreground lg:col-span-4">
        <summary className="cursor-pointer">HS codes of the office ({hsCodes.length})</summary>
        <ul className="mt-1 columns-2 gap-4 font-mono sm:columns-3">
          {hsCodes.map((h) => (
            <li key={h.code}>
              {h.code} <span className="font-sans">{h.description}</span>
            </li>
          ))}
        </ul>
      </details>
      <Field
        id={`${p}-packages`}
        label="Packages (as declared)"
        hint="Leave empty when the lines above carry it."
        error={fe?.packages}
      >
        <Input
          id={`${p}-packages`}
          name="packages"
          inputMode="numeric"
          defaultValue={box.packages ?? ""}
        />
      </Field>
      <Field id={`${p}-package-type`} label="Package type" error={fe?.packageType}>
        <NativeSelect
          id={`${p}-package-type`}
          name="packageType"
          defaultValue={box.packageType ?? ""}
          placeholder="— Select —"
          options={[
            ...new Set([...(box.packageType ? [box.packageType] : []), ...packageTypes]),
          ].map((t) => ({ value: t, label: t }))}
        />
      </Field>
      <Field
        id={`${p}-bl`}
        label="B/L description — printed on the Bill of Lading"
        className="lg:col-span-2"
        hint="Copy it word for word from the shipper's packing list — the carrier prints exactly what is typed here."
        error={fe?.blDescription}
      >
        <Textarea
          id={`${p}-bl`}
          name="blDescription"
          rows={2}
          defaultValue={box.blDescription ?? ""}
          placeholder={"620 BALES OF WORN CLOTHING\nSAID TO CONTAIN"}
        />
      </Field>
    </fieldset>
  );
}
