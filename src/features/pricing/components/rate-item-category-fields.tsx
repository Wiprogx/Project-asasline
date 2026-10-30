"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { SearchPicker } from "@/components/shared/search-picker";
import { Input } from "@/components/ui/input";
import { FREE_KINDS, FREE_SIDES } from "@/domain/pricing";
import type { Errors, Group, RateItemValues } from "./rate-item-types";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function TextField({
  name,
  label,
  value,
  fe,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  fe: Errors;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field id={`ri-${name}`} label={label} error={fe?.[name]}>
      <Input
        id={`ri-${name}`}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={value ?? ""}
        placeholder={placeholder}
      />
    </Field>
  );
}

function PortField({ name, label, v, fe, lists }: Group & { name: "pol" | "pod"; label: string }) {
  return (
    <Field id={`ri-${name}`} label={label} error={fe?.[name]}>
      <SearchPicker
        id={`ri-${name}`}
        name={name}
        options={lists.ports}
        defaultValue={(v?.[name] as string) ?? null}
        placeholder="Search port, code or country"
        limit={50}
        free
      />
    </Field>
  );
}

/** The country a document is required for (an ocean leg's is its port of discharge's). */
function CountryField({ v, fe, lists }: Group) {
  return (
    <Field id="ri-country" label="Required for country" error={fe?.country}>
      <SearchPicker
        id="ri-country"
        name="country"
        options={lists.countries}
        defaultValue={(v?.country as string) ?? null}
        placeholder="Search: CM, Cameroun…"
        limit={50}
      />
    </Field>
  );
}

function BoxField({ v, fe, lists }: Group) {
  return (
    <Field id="ri-containerType" label="Container type" error={fe?.containerType}>
      <SearchPicker
        id="ri-containerType"
        name="containerType"
        options={lists.containerTypes.map((t) => ({ value: t, label: t }))}
        defaultValue={(v?.containerType as string) ?? (v?.id ? null : "40HC")}
        placeholder="Search: 40HC…"
        free
      />
    </Field>
  );
}

/** The line that operates the sailing, or the trucker: a contact with that profession. */
function CarrierField({ v, fe, lists, trucker }: Group & { trucker?: boolean }) {
  return (
    <Field
      id="ri-carrierId"
      label={trucker ? "Trucker" : "Shipping line"}
      error={fe?.carrierId}
      hint={
        trucker
          ? "A contact with the Transporter profession."
          : "The line that operates the sailing — not its local agent. One row per line: the same destination with two carriers is two rate items, each with its own price and transit."
      }
    >
      <SearchPicker
        id="ri-carrierId"
        name="carrierId"
        options={trucker ? lists.truckers : lists.carriers}
        defaultValue={(v?.carrierId as string) ?? null}
        placeholder={trucker ? "— Select trucker —" : "Search the carrier register"}
        empty="No contact with that profession matches."
      />
    </Field>
  );
}

function ScopeField({ v, fe, both = true }: { v?: RateItemValues; fe: Errors; both?: boolean }) {
  return (
    <Field id="ri-scope" label="Applies to" error={fe?.scope}>
      <NativeSelect
        id="ri-scope"
        name="scope"
        defaultValue={v?.scope ?? (both ? "" : "export")}
        options={[
          { value: "export", label: "Export" },
          { value: "import", label: "Import" },
          ...(both ? [{ value: "", label: "Both" }] : []),
        ]}
      />
    </Field>
  );
}

function NameField({
  v,
  fe,
  placeholder,
}: {
  v?: RateItemValues;
  fe: Errors;
  placeholder: string;
}) {
  return <TextField name="name" label="Name" value={v?.name} fe={fe} placeholder={placeholder} />;
}

function FreeTimeFields(g: Group) {
  const { v, fe } = g;
  return (
    <>
      <Field id="ri-freeKind" label="Charge kind" error={fe?.freeKind}>
        <NativeSelect
          id="ri-freeKind"
          name="freeKind"
          defaultValue={v?.freeKind ?? "demurrage"}
          options={FREE_KINDS.map((k) => ({ value: k, label: cap(k) }))}
        />
      </Field>
      <Field id="ri-side" label="Where" error={fe?.side}>
        <NativeSelect
          id="ri-side"
          name="side"
          defaultValue={v?.side ?? "destination"}
          options={FREE_SIDES.map((k) => ({ value: k, label: `At ${k}` }))}
        />
      </Field>
      <ScopeField v={v} fe={fe} />
      <TextField
        name="freeDays"
        label="Free days"
        type="number"
        value={v?.freeDays}
        fe={fe}
        placeholder="14"
      />
      <NameField v={v} fe={fe} placeholder="Demurrage at destination" />
      <p className="text-xs text-muted-foreground sm:col-span-full">
        Sell / buy below are the <b>daily rate</b> charged after the free days.
      </p>
    </>
  );
}

/**
 * The fields that identify an item of each category (legacy itemCatFields): an ocean leg by its
 * ports, box and line; an inland move by its points and trucker; a document by its code and the
 * country that requires it; the services by a name and the direction they apply to.
 */
export function CategoryFields({ category, ...g }: Group & { category: string }) {
  const { v, fe } = g;
  switch (category) {
    case "ocean":
      return (
        <>
          <PortField name="pol" label="Port of loading" {...g} />
          <PortField name="pod" label="Port of discharge" {...g} />
          <BoxField {...g} />
          <CarrierField {...g} />
          <TextField
            name="transitDays"
            label="Transit (days)"
            type="number"
            value={v?.transitDays}
            fe={fe}
          />
        </>
      );
    case "inland":
      return (
        <>
          <TextField
            name="fromPlace"
            label="Pickup point"
            value={v?.fromPlace}
            fe={fe}
            placeholder="Depot, port or contact address"
          />
          <TextField
            name="toPlace"
            label="Delivery / loading point"
            value={v?.toPlace}
            fe={fe}
            placeholder="Loading address or city"
          />
          <BoxField {...g} />
          <CarrierField {...g} trucker />
        </>
      );
    case "docs":
      return (
        <>
          <TextField
            name="docCode"
            label="Document code — this item produces it"
            value={v?.docCode}
            fe={fe}
            placeholder="BESC"
          />
          <CountryField {...g} />
        </>
      );
    case "customs":
      return (
        <>
          <NameField v={v} fe={fe} placeholder="Export customs + declaration" />
          <ScopeField v={v} fe={fe} both={false} />
        </>
      );
    case "freetime":
      return <FreeTimeFields {...g} />;
    case "vgm":
      return (
        <>
          <NameField v={v} fe={fe} placeholder="VGM certificate" />
          <ScopeField v={v} fe={fe} />
        </>
      );
    default:
      return <NameField v={v} fe={fe} placeholder="Terminal Handling Charge" />;
  }
}
