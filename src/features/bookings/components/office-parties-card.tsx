"use client";

import { type ReactNode, useState } from "react";
import { Field } from "@/components/shared/field";
import { SearchPicker } from "@/components/shared/search-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OFFICE_PARTIES, partyOptions } from "@/domain/booking-parties";
import { type LinePlace, defaultPlace, placesForLine } from "@/domain/line-places";
import { PlaceField } from "./place-field";

type Contact = { id: string; name: string; professions?: string[] | null; tags?: string[] | null };
export type BookingPlaces = {
  depots: readonly LinePlace[];
  terminals: readonly LinePlace[];
  /** Every other location, offered after the places with the role. */
  locations?: readonly LinePlace[];
};

/**
 * The office's counterparts on the file and where the box is collected and delivered (legacy
 * registry: doc check, shipping company, transporter, destination forwarder, forwarder, customs,
 * pick-up depot and date, terminal). Each picker is searched as typed and lists the contacts
 * that fit the role first. The depot and the terminal start as the line's own (another line
 * chosen starts them over with its latest linked ones); any other location may be picked.
 */
export function OfficePartiesCard({
  values,
  contacts,
  places,
  dialogs = {},
  errors,
}: {
  values: Record<string, string | number | null | undefined>;
  contacts: readonly Contact[];
  /** The locations linked to a contact as its Depot or Terminal (domain/line-places). */
  places: BookingPlaces;
  /** "+ New depot" / "+ New terminal", rendered by the page (they live with the contacts). */
  dialogs?: { depot?: ReactNode; terminal?: ReactNode };
  errors?: Record<string, string[] | undefined>;
}) {
  const text = (k: string) => String(values[k] ?? "");
  const [lineId, setLineId] = useState<string | null>(text("shippingCoId") || null);
  const [depot, setDepot] = useState<string | null>(text("pickupDepotId") || null);
  const [terminal, setTerminal] = useState<string | null>(text("terminalId") || null);
  const [made, setMade] = useState<BookingPlaces>({ depots: [], terminals: [] });
  const all = {
    depots: [...made.depots, ...places.depots],
    terminals: [...made.terminals, ...places.terminals],
  };
  // A place made from the dialog is the line's own.
  const linked = (p: { value: string; label: string }): LinePlace => ({
    ...p,
    under: lineId ? [lineId] : [],
  });
  const changeLine = (id: string | null) => {
    const line = id || null;
    setLineId(line);
    setDepot(defaultPlace(all.depots, line));
    setTerminal(defaultPlace(all.terminals, line));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>On the file</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFFICE_PARTIES.map((p) => (
          <Field
            key={p.key}
            id={p.key}
            label={p.label}
            hint={"hint" in p ? p.hint : undefined}
            error={errors?.[p.key]}
          >
            <SearchPicker
              id={p.key}
              name={p.key}
              defaultValue={text(p.key)}
              placeholder="Search…"
              empty="No contact matches."
              options={partyOptions(contacts, p.match, "only" in p && p.only)}
              onChange={p.key === "shippingCoId" ? changeLine : undefined}
            />
          </Field>
        ))}
        <PlaceField
          id="pickupDepotId"
          label="Pick-up depot"
          hint="Proposed for the boxes — each says where and when its empty is collected (Containers). The line's depots first, any other place after."
          options={placesForLine(all.depots, lineId, places.locations)}
          ownerId={lineId}
          value={depot}
          set={setDepot}
          made={(p) => setMade((m) => ({ ...m, depots: [linked(p), ...m.depots] }))}
          before={text("pickupDepot") || null}
          dialog={dialogs.depot}
          error={errors?.pickupDepotId}
        />
        <PlaceField
          id="terminalId"
          label="Terminal"
          hint="Where the full box is delivered: the line's terminals first, any other place after."
          options={placesForLine(all.terminals, lineId, places.locations)}
          ownerId={lineId}
          value={terminal}
          set={setTerminal}
          made={(p) => setMade((m) => ({ ...m, terminals: [linked(p), ...m.terminals] }))}
          before={text("terminal") || null}
          dialog={dialogs.terminal}
          error={errors?.terminalId}
        />
      </CardContent>
    </Card>
  );
}
