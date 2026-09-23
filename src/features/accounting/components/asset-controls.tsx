"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
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
import { useToastedAction } from "@/hooks/use-action-toast";
import { disposeAsset, setAssetYears } from "../asset-actions";

/** The years, changed in place (refused once a booked month is closed). */
export function AssetYears({ id, version, years }: { id: string; version: number; years: number }) {
  const [, run, pending] = useToastedAction(setAssetYears);
  return (
    <ActionForm action={run} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Input
        name="years"
        type="number"
        min={1}
        max={50}
        defaultValue={years}
        aria-label="Years"
        className="h-7 w-16"
      />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        Set
      </Button>
    </ActionForm>
  );
}

/** Sold or scrapped on a day, with what happened to it. */
export function DisposeAsset(p: { id: string; version: number; name: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(disposeAsset, () => setOpen(false));
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Dispose</DialogTrigger>
      <DialogContent>
        <ActionForm action={run} className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Dispose of {p.name}?</DialogTitle>
            <DialogDescription>
              Depreciation stops that month; what is left of its value is booked as a loss.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="version" value={p.version} />
          <Field id={`ad-date-${p.id}`} label="Sold or scrapped on" error={fe?.disposedOn}>
            <Input
              id={`ad-date-${p.id}`}
              name="disposedOn"
              type="date"
              defaultValue={p.today}
              required
            />
          </Field>
          <Field id={`ad-note-${p.id}`} label="What happened" error={fe?.note}>
            <Input
              id={`ad-note-${p.id}`}
              name="note"
              required
              placeholder="Scrapped — broken screen"
            />
          </Field>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              Dispose
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
