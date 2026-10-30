"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTE_SERVICE_LABELS } from "@/domain/route-service";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createQuotation } from "../actions";
import type { NewQuotationChoices } from "../new-queries";
import { CommodityRows, type CommodityDraft } from "./commodity-rows";
import { DestinationFields, type DestinationDraft, emptyDestination } from "./destination-fields";

type Client = { id: string; name: string; paymentTermId: string | null };

/** The destinations added so far, each in one line, removable before saving. */
function AddedDestinations({
  added,
  lanes,
  remove,
}: {
  added: DestinationDraft[];
  lanes: readonly PickerOption[];
  remove: (i: number) => void;
}) {
  if (!added.length) return <p className="text-sm text-muted-foreground">No destination yet.</p>;
  return (
    <ul className="grid gap-1 text-sm">
      {added.map((d, i) => (
        <li
          key={i}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
        >
          <span>
            {lanes.find((l) => l.value === d.laneId)?.label ?? "?"} · {d.boxes} container
            {d.boxes === 1 ? "" : "s"} · {ROUTE_SERVICE_LABELS[d.service].split(" —")[0]}
            {d.loadingMode ? ` · ${d.loadingMode}` : ""}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * A new quotation (legacy fQ): who it is for, the document agreed, one or more destinations
 * built from ocean legs of the catalogue, what is shipped, until when, on which terms. The
 * destination being typed counts as one — "Add" is only for the next.
 */
export function NewQuotationForm({
  clients,
  places,
  choices,
}: {
  clients: readonly Client[];
  places: readonly PickerOption[];
  choices: NewQuotationChoices;
}) {
  const [state, action, pending] = useToastedAction(createQuotation);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const [added, setAdded] = useState<DestinationDraft[]>([]);
  const [draft, setDraft] = useState(emptyDestination);
  const [draftKey, setDraftKey] = useState(0);
  const [hs, setHs] = useState<CommodityDraft[]>([{ code: "", description: null }]);
  const [term, setTerm] = useState("");
  const seaWaybill = choices.docTypes.find((d) => d.code === "sea_waybill")?.value;
  const all = draft.laneId ? [...added, draft] : added;
  return (
    <ActionForm action={action} className="grid max-w-4xl gap-6">
      <input type="hidden" name="destinations" value={JSON.stringify(all)} />
      <input type="hidden" name="commodities" value={JSON.stringify(hs.filter((r) => r.code))} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="kind" label="Type">
          <NativeSelect
            id="kind"
            name="kind"
            defaultValue="export"
            options={[
              { value: "export", label: "Export" },
              { value: "import", label: "Import" },
            ]}
          />
        </Field>
        <Field
          id="clientId"
          label="Customer"
          hint="From Contacts"
          error={fe?.clientId}
          required
          className="sm:col-span-2"
        >
          <SearchPicker
            id="clientId"
            name="clientId"
            required
            placeholder="— Select customer —"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(id) => setTerm(clients.find((c) => c.id === id)?.paymentTermId ?? "")}
          />
        </Field>
        <Field
          id="docTypeId"
          label="Document type"
          hint="Agreed here and carried onto the booking — an original B/L brings the courier steps with it, a waybill does not."
          className="sm:col-span-full"
        >
          <NativeSelect
            id="docTypeId"
            name="docTypeId"
            defaultValue={seaWaybill}
            options={choices.docTypes}
          />
        </Field>
      </div>
      <fieldset className="grid gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Destinations — at least one</legend>
        <AddedDestinations
          added={added}
          lanes={choices.lanes}
          remove={(i) => setAdded(added.filter((_, k) => k !== i))}
        />
        <DestinationFields
          key={draftKey}
          d={draft}
          set={setDraft}
          lanes={choices.lanes}
          modes={choices.modes}
          places={places}
          fe={fe}
        />
        <div className="grid gap-1">
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={!draft.laneId}
              onClick={() => {
                setAdded([...added, draft]);
                setDraft(emptyDestination());
                setDraftKey((k) => k + 1);
              }}
            >
              + Add this destination
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add it and the fields clear for the next one. One destination is enough — you do not
            have to press Add for it. A new destination must exist as a rate item —{" "}
            <Link href="/settings/catalogue" className="underline">
              open the catalogue
            </Link>
            .
          </p>
          {fe?.destinations && <p className="text-xs text-destructive">{fe.destinations[0]}</p>}
        </div>
      </fieldset>
      <CommodityRows rows={hs} set={setHs} hs={choices.hs} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="validUntil" label="Valid until" error={fe?.validUntil}>
          <Input id="validUntil" name="validUntil" type="date" />
        </Field>
        <Field
          id="paymentTermId"
          label="Payment terms"
          hint="Printed on the quotation; a customer can have a default of their own."
          error={fe?.paymentTermId}
        >
          <NativeSelect
            id="paymentTermId"
            name="paymentTermId"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="— the customer's own —"
            options={choices.terms}
          />
        </Field>
      </div>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create quotation"}
        </Button>
      </div>
    </ActionForm>
  );
}
