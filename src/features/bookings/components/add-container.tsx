"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addContainer } from "../container-actions";

export function AddContainer({ bookingId, types }: { bookingId: string; types: string[] }) {
  const [, action, pending] = useToastedAction(addContainer);
  return (
    <ActionForm action={action} className="flex items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <NativeSelect
        name="type"
        defaultValue="40HC"
        aria-label="Container type"
        className="w-32"
        options={types.map((t) => ({ value: t, label: t }))}
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Add container
      </Button>
    </ActionForm>
  );
}
