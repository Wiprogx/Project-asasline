"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type LoadingMode, type LoadingModeRow, loadingModeRow } from "@/domain/loading";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveLoadingModes } from "../actions";

type Row = LoadingModeRow & { key: number };

const KINDS = [
  { value: "direct", label: "Direct loading — the truck waits" },
  { value: "drop", label: "Drop-off — chassis or box left on site" },
];

const blank = (key: number): Row => ({
  key,
  name: "",
  hours: "",
  kind: "direct",
  surcharge: "",
  qty: "",
});

function ModeLine({
  r,
  i,
  items,
  put,
  remove,
}: {
  r: Row;
  i: number;
  items: readonly string[];
  put: (patch: Partial<Row>) => void;
  remove: () => void;
}) {
  const drop = r.kind === "drop";
  // A saved surcharge the catalogue no longer names stays offered, so the row still saves as it is.
  const surcharges = [...new Set([...items, ...(r.surcharge ? [r.surcharge] : [])])];
  return (
    <TableRow>
      <TableCell>
        <Input
          name="name"
          aria-label={`Mode ${i + 1} name`}
          value={r.name}
          onChange={(e) => put({ name: e.target.value })}
          placeholder="Direct loading — 3 hours"
          maxLength={80}
        />
      </TableCell>
      <TableCell>
        <NativeSelect
          name="kind"
          aria-label={`Mode ${i + 1} kind`}
          value={r.kind}
          onChange={(e) =>
            put({ kind: e.target.value, hours: e.target.value === "drop" ? "0" : r.hours })
          }
          options={KINDS}
        />
      </TableCell>
      <TableCell>
        <Input
          name="hours"
          type="number"
          min={0}
          max={48}
          step={1}
          aria-label={`Mode ${i + 1} hours included`}
          value={drop ? "0" : r.hours}
          onChange={(e) => put({ hours: e.target.value })}
          // Read-only, not disabled: a disabled cell is not posted and the rows would slip.
          readOnly={drop}
          className="w-20 tabular-nums"
        />
      </TableCell>
      <TableCell>
        <NativeSelect
          name="surcharge"
          aria-label={`Mode ${i + 1} surcharge`}
          value={r.surcharge}
          onChange={(e) => put({ surcharge: e.target.value })}
          placeholder="— none —"
          options={surcharges.map((s) => ({ value: s, label: s }))}
        />
      </TableCell>
      <TableCell>
        <Input
          name="qty"
          type="number"
          min={0}
          max={50}
          step={1}
          aria-label={`Mode ${i + 1} surcharge quantity`}
          value={r.qty}
          onChange={(e) => put({ qty: e.target.value })}
          placeholder={r.surcharge ? "1" : ""}
          readOnly={!r.surcharge}
          className="w-20 tabular-nums"
        />
      </TableCell>
      <TableCell className="text-right">
        <Button type="button" variant="ghost" size="sm" onClick={remove}>
          Remove
        </Button>
      </TableCell>
    </TableRow>
  );
}

/**
 * Settings › Loading modes as a list, one row per mode (legacy LOADING_MODES): its name, whether
 * the truck waits (direct loading, so many hours included) or leaves the chassis or the box on
 * site (a drop-off: the box says when it is delivered and picked back), and the catalogue item
 * charged on top. Saved as one table with its version: a row removed is gone from the pickers;
 * the quotations and boxes that chose it keep its name.
 */
export function LoadingModesEditor({
  modes,
  version,
  items,
}: {
  modes: readonly LoadingMode[];
  version: number;
  /** The catalogue items a mode may charge on top, by name. */
  items: readonly string[];
}) {
  const [state, run, pending] = useToastedAction(saveLoadingModes);
  const [rows, setRows] = useState<Row[]>(() =>
    modes.map((m, key) => ({ key, ...loadingModeRow(m) })),
  );
  const [next, setNext] = useState(modes.length);
  const put = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading modes</CardTitle>
        <CardDescription>
          How a box is loaded and how long the truck may stay — chosen on a quotation (it decides
          the price) and on each box of a booking. Direct loading includes so many hours of waiting,
          beyond which the surcharge is charged per hour; a drop-off leaves the chassis or the box
          on site, its days charged from the free-time terms, and the box says when it is delivered
          and when it is picked back.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={run} className="grid gap-3">
          <input type="hidden" name="version" value={version} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mode</TableHead>
                <TableHead className="w-64">Kind</TableHead>
                <TableHead className="w-24">Hours</TableHead>
                <TableHead className="w-64">Surcharge (catalogue item)</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <ModeLine
                  key={r.key}
                  r={r}
                  i={i}
                  items={items}
                  put={(patch) => put(r.key, patch)}
                  remove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                />
              ))}
            </TableBody>
          </Table>
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRows((rs) => [...rs, blank(next)]);
                setNext((n) => n + 1);
              }}
            >
              + Add mode
            </Button>
            <span className="text-xs text-muted-foreground">
              {rows.length} modes ·{" "}
              {version === 0 ? "built-in defaults, not yet saved" : `version ${version}`}
            </span>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save loading modes"}
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
