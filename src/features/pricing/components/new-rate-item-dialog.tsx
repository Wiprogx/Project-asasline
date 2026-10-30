"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RateSource } from "@/domain/rate-sources";
import { RateItemForm, type RateItemLists } from "./rate-item-form";

/**
 * "New item" above the catalogue: the item's form in a dialog (legacy fItem), a fresh one each
 * time it opens, closed once the item is in the catalogue; a refusal keeps it open with what
 * was typed.
 */
export function NewRateItemDialog({
  lists,
  sources,
}: {
  lists: RateItemLists;
  sources: readonly RateSource[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New item</DialogTrigger>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>New rate item</DialogTitle>
          <DialogDescription>
            Its category decides what identifies it; then the price, where the rate comes from, its
            VAT and until when it holds.
          </DialogDescription>
        </DialogHeader>
        <RateItemForm
          key={String(open)}
          lists={lists}
          sources={sources}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
