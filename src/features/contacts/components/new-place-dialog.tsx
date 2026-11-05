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
import { createLinkedPlace } from "../place-actions";
import { type LinkedPlaceRole, PLACE_WORDS } from "../place-roles";
import { LinkedFields } from "./linked-fields";

/** What a page gives the dialog once: the lists its form offers. */
export type NewPlaceLists = {
  countries: readonly Country[];
  salutations: readonly { value: string; label: string }[];
};

/**
 * "+ New location" on a quotation, "+ New depot" / "+ New terminal" on a booking: a location
 * contact typed in full — the same form as a location added from a contact's page — linked
 * under the contact chosen (the customer as its delivery address, the shipping line as its
 * depot or terminal) when one is, a location of its own otherwise; picked at once.
 */
export function NewPlaceDialog({
  lists,
  role = "delivery",
}: {
  lists: NewPlaceLists;
  role?: LinkedPlaceRole;
}) {
  // The contact chosen and what to do with the place: lent by the form it sits in.
  const { clientId, onMade } = usePlaceSlot();
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(createLinkedPlace, (place) => {
    onMade(place);
    setOpen(false);
  });
  const fe = !state.ok ? state.fieldErrors : undefined;
  const w = PLACE_WORDS[role];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        + New {w.noun}
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-5xl">
        <ActionForm action={run} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New {w.noun}</DialogTitle>
            <DialogDescription>
              {clientId
                ? `Kept as a location contact of the ${w.owner} — its ${w.role.toLowerCase()} — offered first on its next ${w.next}.`
                : `Kept as a location contact of its own; choose the ${w.owner} to link it as its ${w.role.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          {clientId && <input type="hidden" name="contactId" value={clientId} />}
          <input type="hidden" name="role" value={role} />
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
              {pending ? "Adding…" : `Add the ${w.noun}`}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
