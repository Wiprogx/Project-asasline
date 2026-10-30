"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PORT_KIND_LABELS, PORT_KINDS } from "@/domain/ports";
import type { PortRow } from "../queries";

type Errors = Record<string, string[] | undefined> | undefined;
type Option = { value: string; label: string };

const KIND_OPTIONS = PORT_KINDS.map((k) => ({ value: k, label: PORT_KIND_LABELS[k] }));

function Identity({ id, fe, port }: { id: (n: string) => string; fe: Errors; port?: PortRow }) {
  return (
    <>
      {!port && (
        <Field id={id("code")} label="UN/LOCODE" error={fe?.code} hint="It stays." required>
          <Input
            id={id("code")}
            name="code"
            placeholder="CMDLA"
            required
            maxLength={5}
            className="font-mono uppercase"
          />
        </Field>
      )}
      <Field id={id("name")} label="Name" error={fe?.name} required>
        <Input id={id("name")} name="name" defaultValue={port?.name} required maxLength={80} />
      </Field>
      <Field id={id("country")} label="Country" error={fe?.country} required>
        <Input
          id={id("country")}
          name="country"
          defaultValue={port?.country}
          placeholder="CM"
          required
          maxLength={2}
          className="font-mono uppercase"
        />
      </Field>
    </>
  );
}

function Place({ id, fe, port }: { id: (n: string) => string; fe: Errors; port?: PortRow }) {
  return (
    <>
      <Field id={id("latitude")} label="Latitude" error={fe?.latitude} hint="Decimal degrees">
        <Input id={id("latitude")} name="latitude" defaultValue={port?.latitude ?? ""} />
      </Field>
      <Field id={id("longitude")} label="Longitude" error={fe?.longitude} hint="Decimal degrees">
        <Input id={id("longitude")} name="longitude" defaultValue={port?.longitude ?? ""} />
      </Field>
      <Field id={id("timezone")} label="Time zone" error={fe?.timezone} hint="e.g. Africa/Douala">
        <Input id={id("timezone")} name="timezone" defaultValue={port?.timezone ?? ""} />
      </Field>
    </>
  );
}

/** A port as the add and edit dialogs ask it; its code is asked only when it is added. */
export function PortFields({
  prefix,
  fe,
  regions,
  port,
}: {
  prefix: string;
  fe: Errors;
  regions: readonly Option[];
  port?: PortRow;
}) {
  const id = (n: string) => `${prefix}${n}`;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Identity id={id} fe={fe} port={port} />
      <Field id={id("region")} label="Region" error={fe?.regionId}>
        <NativeSelect
          id={id("region")}
          name="regionId"
          options={regions}
          placeholder="—"
          defaultValue={port?.regionId ?? ""}
        />
      </Field>
      <Field id={id("kind")} label="Kind" error={fe?.kind}>
        <NativeSelect
          id={id("kind")}
          name="kind"
          options={KIND_OPTIONS}
          defaultValue={port?.kind}
        />
      </Field>
      <Place id={id} fe={fe} port={port} />
      <Field
        id={id("aliases")}
        label="Other names"
        error={fe?.aliases}
        hint="Separated by ; — a port field finds the port by any of them."
        className="sm:col-span-full"
      >
        <Input id={id("aliases")} name="aliases" defaultValue={port?.aliases.join("; ") ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-full">
        <input
          type="checkbox"
          name="preClearance"
          defaultChecked={port?.preClearance}
          className="size-4 accent-primary"
        />
        Goods are cleared before loading here (pre-clearance)
      </label>
      <Field id={id("notes")} label="Notes" error={fe?.notes} className="sm:col-span-full">
        <Textarea id={id("notes")} name="notes" defaultValue={port?.notes ?? ""} rows={2} />
      </Field>
    </div>
  );
}
