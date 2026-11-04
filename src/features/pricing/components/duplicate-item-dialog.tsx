"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { SearchPicker } from "@/components/shared/search-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { centsToInput } from "@/domain/money";
import type { RateSource } from "@/domain/rate-sources";
import { useToastedAction } from "@/hooks/use-action-toast";
import { duplicateRateItem } from "../duplicate-actions";
import { duplicateRateItemSchema } from "../duplicate-schema";
import { RateItemForm } from "./rate-item-form";
import type { RateItemLists, RateItemValues } from "./rate-item-types";

/** A freight item — an ocean leg or an inland move — is copied for another carrier or price. */
const FREIGHT = ["ocean", "inland"];

/**
 * "Duplicate" on a catalogue item (legacy: the same destination with two carriers is two rate
 * items). Freight: a copy with its own carrier, prices and rate source, everything else as the
 * original, and the page then shows the copy. Any other category: the whole form, filled in from
 * the original, saved as a new item.
 */
export function DuplicateItemDialog({
  item,
  lists,
  sources,
}: {
  item: RateItemValues & { id: string; category: string; label: string };
  lists: RateItemLists;
  sources: readonly RateSource[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, run, pending] = useToastedAction(
    duplicateRateItem,
    (d) => {
      setOpen(false);
      router.push(`/settings/catalogue/${d.id}`);
    },
    duplicateRateItemSchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  const trucker = item.category === "inland";
  const freight = FREIGHT.includes(item.category);
  if (!freight)
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>Duplicate</DialogTrigger>
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Duplicate this item</DialogTitle>
            <DialogDescription>
              Every field of “{item.label}”, to change what differs and save as a new item; the
              original is untouched.
            </DialogDescription>
          </DialogHeader>
          <RateItemForm
            key={String(open)}
            lists={lists}
            sources={sources}
            values={{ ...item, id: undefined, version: undefined }}
            onSaved={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Duplicate</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate this item</DialogTitle>
          <DialogDescription>
            A copy of “{item.label}” with its own carrier, prices and rate source; everything else
            stays as on the original, which is untouched.
          </DialogDescription>
        </DialogHeader>
        <ActionForm key={String(open)} action={run} className="grid gap-4">
          <input type="hidden" name="id" value={item.id} />
          <Field
            id="dup-carrierId"
            label={trucker ? "Trucker" : "Shipping line"}
            error={fe?.carrierId}
          >
            <SearchPicker
              id="dup-carrierId"
              name="carrierId"
              options={trucker ? lists.truckers : lists.carriers}
              defaultValue={(item.carrierId as string) ?? null}
              placeholder={trucker ? "— Select trucker —" : "Search the carrier register"}
              empty="No contact with that profession matches."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="dup-sellCents" label="Sell price (€)" error={fe?.sellCents}>
              <Input
                id="dup-sellCents"
                name="sellCents"
                type="number"
                step="0.01"
                min="0"
                defaultValue={centsToInput(item.sellCents)}
              />
            </Field>
            <Field id="dup-buyCents" label="Buy price / cost (€)" error={fe?.buyCents}>
              <Input
                id="dup-buyCents"
                name="buyCents"
                type="number"
                step="0.01"
                min="0"
                defaultValue={centsToInput(item.buyCents)}
              />
            </Field>
          </div>
          <Field id="dup-rateType" label="Rate source" error={fe?.rateType}>
            <NativeSelect
              id="dup-rateType"
              name="rateType"
              defaultValue={item.rateType ?? "contract"}
              options={sources.map((r) => ({ value: r.key, label: r.label }))}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Duplicate
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
