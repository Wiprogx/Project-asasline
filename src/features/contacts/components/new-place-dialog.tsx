"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
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
import type { Country } from "@/domain/countries";
import { usePlaceSlot } from "@/components/shared/place-slot";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createDeliveryPlace } from "../place-actions";
import { LinkedFields } from "./linked-fields";

/** What a page gives the dialog once: the lists its form offers. */
export type NewPlaceLists = {
  countries: readonly Country[];
  salutations: readonly { value: string; label: string }[];
};

/**
 * "+ New location" on a quotation: a location contact typed in full — the same form as a
 * location added from a contact's page — linked to the customer as its delivery address when
 * one is chosen, a location of its own otherwise; picked for the box at once.
 */
export function NewPlaceDialog({ lists }: { lists: NewPlaceLists }) {
  // The customer chosen and what to do with the place: lent by the form it sits in.
  const { clientId, onMade } = usePlaceSlot();
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(createDeliveryPlace, (place) => {
    onMade(place);
    setOpen(false);
  });
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        + New location
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-5xl">
        <ActionForm action={run} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New location</DialogTitle>
            <DialogDescription>
              {clientId
                ? "Kept as a location contact of the customer — its delivery address — offered first on its next quotations."
                : "Kept as a location contact of its own; choose the customer to link it as its delivery address."}
            </DialogDescription>
          </DialogHeader>
          {clientId && <input type="hidden" name="contactId" value={clientId} />}
          <LinkedFields
            type="location"
            values={{}}
            fe={fe}
            prefix="np-"
            salutations={lists.salutations}
            countries={lists.countries}
          />
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add the location"}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
