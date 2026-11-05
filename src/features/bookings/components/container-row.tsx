"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { removeContainer, updateContainer } from "../container-actions";
import { containerSchema } from "../schemas";
import { type BoxGoodsValues, BoxGoodsFields } from "./box-goods-fields";
import { type BoxLoading, BoxLoadingFields, type LoadPlaces } from "./box-loading-fields";
import { type LoadingMode } from "@/domain/loading";
import { type HsCode } from "@/domain/goods";
import type { BoxOwner } from "@/domain/lookups";

export type Box = BoxLoading &
  BoxGoodsValues & {
    id: string;
    version: number;
    type: string;
    number: string | null;
    seals: string[];
    tareKg: number | null;
    cargoKg: number | null;
  };

/** What the boxes' forms offer: the lists of Settings and the places a box may be loaded at. */
export type BoxLists = {
  types: string[];
  modes: readonly LoadingMode[];
  truckers: readonly { id: string; name: string }[];
  hsCodes: readonly HsCode[];
  packageTypes: readonly string[];
  /** Who may have sealed a box (Settings › Lists › Seal sources). */
  sealSources: readonly string[];
  owners: readonly BoxOwner[];
  specs: Record<string, { tareKg: number; maxGrossKg: number }>;
  places: LoadPlaces;
};

export function ContainerRow({
  box,
  index,
  bookingId,
  lists,
  canRemove,
  children,
}: {
  box: Box;
  index: number;
  bookingId: string;
  lists: BoxLists;
  canRemove: boolean;
  children?: React.ReactNode;
}) {
  const [state, action, pending] = useToastedAction(updateContainer, undefined, containerSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const p = `c${index}`;
  const typeOptions = [...new Set([box.type, ...lists.types])].map((t) => ({
    value: t,
    label: t,
  }));

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Container #{index + 1}</span>
        <div className="flex items-center gap-2">
          {children}
          {canRemove && (
            <ReasonDialog
              action={removeContainer}
              hidden={{ id: box.id, bookingId, version: box.version }}
              trigger="Remove"
              title={`Remove container #${index + 1}?`}
              description="It leaves the booking but stays in its history."
              confirmLabel="Remove"
            />
          )}
        </div>
      </div>
      <ActionForm
        action={action}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_7rem_1fr_7rem_7rem_auto] lg:items-end"
      >
        <input type="hidden" name="id" value={box.id} />
        <input type="hidden" name="bookingId" value={bookingId} />
        <input type="hidden" name="version" value={box.version} />
        <Field id={`${p}-number`} label="Number (ISO 6346)" error={fe?.number}>
          <Input
            id={`${p}-number`}
            name="number"
            defaultValue={box.number ?? ""}
            placeholder="MSCU1234565"
            className="font-mono uppercase"
            aria-invalid={!!fe?.number}
          />
        </Field>
        <Field id={`${p}-type`} label="Type">
          <NativeSelect
            id={`${p}-type`}
            name="type"
            defaultValue={box.type}
            options={typeOptions}
          />
        </Field>
        <Field
          id={`${p}-seals`}
          label="Seals (comma-separated)"
          hint={`Who sealed it after the number: "ABC1234 (${lists.sealSources.join(" · ")})"`}
          error={fe?.seals}
        >
          <Input
            id={`${p}-seals`}
            name="seals"
            defaultValue={box.seals.join(", ")}
            className="font-mono"
          />
        </Field>
        <Field id={`${p}-tare`} label="Tare kg" error={fe?.tareKg}>
          <Input
            id={`${p}-tare`}
            name="tareKg"
            inputMode="numeric"
            defaultValue={box.tareKg ?? ""}
          />
        </Field>
        <Field id={`${p}-cargo`} label="Cargo kg" error={fe?.cargoKg}>
          <Input
            id={`${p}-cargo`}
            name="cargoKg"
            inputMode="numeric"
            defaultValue={box.cargoKg ?? ""}
          />
        </Field>
        <BoxGoodsFields
          p={p}
          box={box}
          hsCodes={lists.hsCodes}
          packageTypes={lists.packageTypes}
          fe={fe}
        />
        <BoxLoadingFields
          p={p}
          box={box}
          modes={lists.modes}
          truckers={lists.truckers}
          places={lists.places}
          fe={fe}
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </ActionForm>
    </div>
  );
}
