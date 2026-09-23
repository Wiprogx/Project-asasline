"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Holiday } from "@/domain/rules/calendar";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addHoliday, removeHoliday } from "../actions";

function Remove({ index, version }: { index: number; version: number }) {
  const [, run, pending] = useToastedAction(removeHoliday);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="index" value={index} />
      <input type="hidden" name="version" value={version} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} aria-label="Remove">
        Remove
      </Button>
    </ActionForm>
  );
}

/**
 * Public holidays per country. Belgium's always count (the office); a destination's count for
 * its own papers. A deadline on a closed day moves to the last open day before it.
 */
export function HolidaysEditor({ holidays, version }: { holidays: Holiday[]; version: number }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useToastedAction(addHoliday, () => form.current?.reset());
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="grid gap-4">
      <ActionForm
        ref={form}
        action={run}
        className="grid gap-3 sm:grid-cols-[6rem_10rem_1fr_auto] sm:items-end"
      >
        <input type="hidden" name="version" value={version} />
        <Field id="h-country" label="Country" error={fe?.country}>
          <Input
            id="h-country"
            name="country"
            required
            maxLength={2}
            placeholder="BE"
            className="font-mono uppercase"
          />
        </Field>
        <Field id="h-date" label="Date" error={fe?.date}>
          <Input id="h-date" name="date" type="date" required />
        </Field>
        <Field id="h-name" label="Name" error={fe?.name}>
          <Input id="h-name" name="name" required />
        </Field>
        <Button type="submit" disabled={pending}>
          Add holiday
        </Button>
      </ActionForm>
      <ul className="grid gap-1">
        {holidays.map((h, i) => (
          <li
            key={`${h.country}-${h.date}`}
            className="flex items-center justify-between gap-2 border-b py-1 text-sm last:border-0"
          >
            <span>
              <span className="font-mono text-xs">{h.date}</span> ·{" "}
              <span className="font-mono text-xs">{h.country}</span> · {h.name}
            </span>
            <Remove index={i} version={version} />
          </li>
        ))}
      </ul>
    </div>
  );
}
