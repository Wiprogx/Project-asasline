"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { removeAgreedPrice, setAgreedPrice } from "../list-actions";

type Line = {
  id: string;
  label: string;
  sellCents: number;
  buyCents: number;
  item: { sellCents: number; buyCents: number };
};

/** The agreed prices of one agreement, against the catalogue's. */
export function AgreedPrices({
  priceListId,
  lines,
  items,
}: {
  priceListId: string;
  lines: Line[];
  items: { value: string; label: string }[];
}) {
  const [state, run, pending] = useToastedAction(setAgreedPrice);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <div className="grid gap-3">
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No agreed price yet — quotations for this customer use the catalogue.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Agreed sell</TableHead>
              <TableHead className="text-right">Agreed buy</TableHead>
              <TableHead className="text-right">Catalogue sell</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(l.sellCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCents(l.buyCents)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatCents(l.item.sellCents)}
                </TableCell>
                <TableCell className="text-right">
                  <ReasonDialog
                    action={removeAgreedPrice}
                    hidden={{ id: l.id, priceListId }}
                    trigger="Remove"
                    title="Remove this agreed price?"
                    description="Quotations go back to the catalogue price for this item. The old price stays on the record."
                    confirmLabel="Remove"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ActionForm
        action={run}
        className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end"
      >
        <input type="hidden" name="priceListId" value={priceListId} />
        <Field id="ap-item" label="Catalogue item" error={fe?.itemId}>
          <NativeSelect id="ap-item" name="itemId" required placeholder="Choose…" options={items} />
        </Field>
        <Field id="ap-sell" label="Agreed sell (EUR)" error={fe?.sellCents} hint="Empty: catalogue">
          <Input id="ap-sell" name="sellCents" type="number" step="0.01" min="0" />
        </Field>
        <Field id="ap-buy" label="Agreed buy (EUR)" error={fe?.buyCents} hint="Empty: catalogue">
          <Input id="ap-buy" name="buyCents" type="number" step="0.01" min="0" />
        </Field>
        <Button type="submit" variant="outline" disabled={pending}>
          Set price
        </Button>
      </ActionForm>
    </div>
  );
}
