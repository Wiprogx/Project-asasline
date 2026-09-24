"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { declineRoute, restoreRoute, updateRoute } from "../route-actions";

type Route = {
  id: string;
  pol: string;
  pod: string;
  finalPlace: string | null;
  containerType: string | null;
  declined: boolean;
};

/** Edit a destination, mark it declined by the customer, or put it back. */
export function RouteControls({
  quotationId,
  version,
  route: r,
  booked,
}: {
  quotationId: string;
  version: number;
  route: Route;
  booked: boolean;
}) {
  const [, restore, restoring] = useToastedAction(restoreRoute);
  const hidden = { quotationId, version, routeId: r.id };
  if (r.declined)
    return (
      <ActionForm action={restore}>
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <Button type="submit" variant="outline" size="sm" disabled={restoring}>
          Put back
        </Button>
      </ActionForm>
    );
  return (
    <div className="flex flex-wrap gap-2">
      <FormDialog
        action={updateRoute}
        hidden={hidden}
        trigger="Edit"
        title={`Destination ${r.pol} → ${r.pod}`}
        submitLabel="Save destination"
      >
        {(fe) => (
          <>
            {(
              [
                ["pol", "Port of loading", r.pol],
                ["pod", "Port of discharge", r.pod],
                ["finalPlace", "Final place of delivery", r.finalPlace],
                ["containerType", "Container type", r.containerType],
              ] as const
            ).map(([name, label, value]) => (
              <Field key={name} id={`re-${r.id}-${name}`} label={label} error={fe?.[name]}>
                <Input id={`re-${r.id}-${name}`} name={name} defaultValue={value ?? ""} />
              </Field>
            ))}
          </>
        )}
      </FormDialog>
      {!booked && (
        <ReasonDialog
          action={declineRoute}
          hidden={hidden}
          trigger="Declined"
          title={`The customer declined ${r.pol} → ${r.pod}?`}
          description="It stays on the quotation for the record, marked as declined, with your reason."
          confirmLabel="Mark declined"
        />
      )}
    </div>
  );
}
