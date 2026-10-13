"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CERTI_META, type CertiState } from "@/domain/certiweight";
import { centsToInput } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { cancelCertiweight, switchOnCertiweight } from "../certi-actions";
import { certiOffSchema, certiOnSchema } from "../certi-schemas";

type OnTheFile = {
  quotation: { id: string; ref: string; version: number };
  routeId: string;
  bookingId: string;
};

function Hidden({ quotation, routeId, bookingId }: OnTheFile) {
  return (
    <>
      <input type="hidden" name="quotationId" value={quotation.id} />
      <input type="hidden" name="version" value={quotation.version} />
      <input type="hidden" name="routeId" value={routeId} />
      <input type="hidden" name="bookingId" value={bookingId} />
    </>
  );
}

function SwitchOn({
  file,
  item,
  canSeeCost,
}: {
  file: OnTheFile;
  item: { sellCents: number; buyCents: number };
  canSeeCost: boolean;
}) {
  const [state, run, pending] = useToastedAction(switchOnCertiweight, undefined, certiOnSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={run} className="grid gap-3 sm:grid-cols-2">
      <Hidden {...file} />
      <Field id="certi-sell" label="Price (EUR, per container)" error={fe?.sellCents}>
        <Input
          id="certi-sell"
          name="sellCents"
          inputMode="decimal"
          defaultValue={centsToInput(item.sellCents)}
        />
      </Field>
      {canSeeCost && (
        <Field id="certi-cost" label="Cost (EUR, per container)" error={fe?.costCents}>
          <Input
            id="certi-cost"
            name="costCents"
            inputMode="decimal"
            defaultValue={centsToInput(item.buyCents)}
          />
        </Field>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Switch Certiweight on
        </Button>
      </div>
    </ActionForm>
  );
}

function Cancel({ file, lineId }: { file: OnTheFile; lineId: string }) {
  const [state, run, pending] = useToastedAction(cancelCertiweight, undefined, certiOffSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={run} className="grid gap-3">
      <Hidden {...file} />
      <input type="hidden" name="lineId" value={lineId} />
      <Field id="certi-why" label="Why — it goes in the history" error={fe?.reason}>
        <Input id="certi-why" name="reason" required placeholder="Customer no longer wants it" />
      </Field>
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Cancel Certiweight
        </Button>
      </div>
    </ActionForm>
  );
}

/**
 * Certiweight from the booking (legacy toggleCerti): switched on, the charge goes on the
 * quotation and each box gets its certificate step; cancelled while no certificate is in;
 * locked once one is (legacy certiLocked).
 */
export function CertiweightCard({
  file,
  state,
  lineId,
  item,
  canEdit,
  canSeeCost,
}: {
  file: OnTheFile;
  state: CertiState;
  lineId: string | null;
  item: { sellCents: number; buyCents: number } | null;
  canEdit: boolean;
  canSeeCost: boolean;
}) {
  const meta = CERTI_META[state];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Certiweight{" "}
          <Badge variant={state === "off" ? "outline" : "secondary"}>{meta.status}</Badge>
        </CardTitle>
        <CardDescription>{meta.hint}</CardDescription>
      </CardHeader>
      {canEdit && (
        <CardContent>
          {state === "off" &&
            (item ? (
              <SwitchOn file={file} item={item} canSeeCost={canSeeCost} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No Certiweight item in the catalogue — add one under Settings › Catalogue.
              </p>
            ))}
          {state === "sold" && lineId && <Cancel file={file} lineId={lineId} />}
        </CardContent>
      )}
    </Card>
  );
}
