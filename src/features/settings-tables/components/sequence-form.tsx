"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
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
import { sequenceLabel } from "@/domain/accounting-settings";
import { useToastedAction } from "@/hooks/use-action-toast";
import { raiseSequence } from "../accounting-actions";
import { raiseSequenceSchema } from "../schemas";

/**
 * The counters behind every number (legacy INVOICE_SEQ): what the next one will be, and a way
 * to move a counter forward so a series continues where the previous system stopped. A counter
 * only ever rises: a number is issued once (invariant 2).
 */
export function SequenceForm({ rows }: { rows: { key: string; value: number }[] }) {
  const [state, run, pending] = useToastedAction(raiseSequence, undefined, raiseSequenceSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Numbering</CardTitle>
        <CardDescription>
          Each series takes its next number from the database inside the transaction that uses it,
          so two people never get the same one. A counter can be moved forward (to continue a series
          from the previous system), never back.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Table aria-label="Counters">
          <TableHeader>
            <TableRow>
              <TableHead>Series</TableHead>
              <TableHead>Key</TableHead>
              <TableHead className="text-right">Last issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Nothing numbered yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{sequenceLabel(r.key)}</TableCell>
                <TableCell className="font-mono text-xs">{r.key}</TableCell>
                <TableCell className="text-right tabular-nums">{r.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ActionForm
          action={run}
          className="grid gap-3 sm:grid-cols-[14rem_10rem_auto] sm:items-end"
        >
          <Field id="seq-key" label="Series" error={fe?.key}>
            <NativeSelect
              id="seq-key"
              name="key"
              placeholder="— choose —"
              options={rows.map((r) => ({ value: r.key, label: sequenceLabel(r.key) }))}
            />
          </Field>
          <Field
            id="seq-value"
            label="Last issued becomes"
            hint="The next number is one more."
            error={fe?.value}
          >
            <Input id="seq-value" name="value" type="number" min="1" />
          </Field>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Moving…" : "Move the counter forward"}
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
