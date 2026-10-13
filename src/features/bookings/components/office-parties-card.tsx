import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OFFICE_PARTIES, partyOptions } from "@/domain/booking-parties";

type Contact = { id: string; name: string; professions?: string[] | null; tags?: string[] | null };

/**
 * The office's counterparts on the file and where the box is collected and delivered (legacy
 * registry: doc check, shipping company, transporter, destination forwarder, forwarder, customs,
 * pick-up depot and date, terminal). Each picker lists the contacts that fit the role first.
 */
export function OfficePartiesCard({
  values,
  contacts,
  places,
  errors,
}: {
  values: Record<string, string | number | null | undefined>;
  contacts: readonly Contact[];
  /** Depots and terminals from the contacts' addresses (tagged Pick up, Depot or Terminal). */
  places: { depots: readonly string[]; terminals: readonly string[] };
  errors?: Record<string, string[] | undefined>;
}) {
  const text = (k: string) => String(values[k] ?? "");
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
            <NativeSelect
              id={p.key}
              name={p.key}
              defaultValue={text(p.key)}
              placeholder="—"
              options={partyOptions(contacts, p.match)}
            />
          </Field>
        ))}
        <Field
          id="pickupDepot"
          label="Pick-up depot"
          hint="Where the empty box is collected."
          error={errors?.pickupDepot}
        >
          <Input
            id="pickupDepot"
            name="pickupDepot"
            list="depots-list"
            defaultValue={text("pickupDepot")}
          />
        </Field>
        <Field id="pickupDate" label="Pick-up date" error={errors?.pickupDate}>
          <Input id="pickupDate" name="pickupDate" type="date" defaultValue={text("pickupDate")} />
        </Field>
        <Field
          id="terminal"
          label="Terminal"
          hint="Where the full box is delivered."
          error={errors?.terminal}
        >
          <Input
            id="terminal"
            name="terminal"
            list="terminals-list"
            defaultValue={text("terminal")}
          />
        </Field>
        <datalist id="depots-list">
          {places.depots.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id="terminals-list">
          {places.terminals.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </CardContent>
    </Card>
  );
}
