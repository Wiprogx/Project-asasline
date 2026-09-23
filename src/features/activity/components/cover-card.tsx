"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addCover, endCover, handOver } from "../cover-actions";

type Cover = {
  id: string;
  absent: string;
  cover: string;
  fromDate: string;
  toDate: string | null;
  open: number;
};
type Person = { id: string; name: string };

function EndCover({ id, started }: { id: string; started: boolean }) {
  const [, run, pending] = useToastedAction(endCover);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {started ? "Back now" : "Cancel"}
      </Button>
    </ActionForm>
  );
}

function AddCover({ staff, today }: { staff: Person[]; today: string }) {
  const [state, run, pending] = useToastedAction(addCover);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const people = staff.map((p) => ({ value: p.id, label: p.name }));
  return (
    <ActionForm action={run} className="grid gap-2 sm:grid-cols-5 sm:items-end">
      <Field id="cv-absent" label="Who is away" error={fe?.absentId}>
        <NativeSelect
          id="cv-absent"
          name="absentId"
          required
          placeholder="Choose…"
          options={people}
        />
      </Field>
      <Field id="cv-cover" label="Who covers" error={fe?.coverId}>
        <NativeSelect
          id="cv-cover"
          name="coverId"
          required
          placeholder="Choose…"
          options={people}
        />
      </Field>
      <Field id="cv-from" label="From" error={fe?.from}>
        <Input id="cv-from" name="from" type="date" defaultValue={today} required />
      </Field>
      <Field id="cv-to" label="Until (optional)" error={fe?.to}>
        <Input id="cv-to" name="to" type="date" />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Someone is away
      </Button>
    </ActionForm>
  );
}

function HandOver({ staff }: { staff: Person[] }) {
  const [, run, pending] = useToastedAction(handOver);
  return (
    <ActionForm action={run} className="grid gap-2 sm:grid-cols-3 sm:items-end">
      <Field id="ho-from" label="Hand over everything of">
        <NativeSelect
          id="ho-from"
          name="from"
          required
          placeholder="Choose…"
          options={[
            ...staff.map((p) => ({ value: p.id, label: p.name })),
            ...ROLES.map((r) => ({ value: r, label: `${ROLE_LABEL[r]} (untaken tasks)` })),
          ]}
        />
      </Field>
      <Field id="ho-to" label="To">
        <NativeSelect
          id="ho-to"
          name="toId"
          required
          placeholder="Choose…"
          options={staff.map((p) => ({ value: p.id, label: p.name }))}
        />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Hand over for good
      </Button>
    </ActionForm>
  );
}

/**
 * Away & cover: who is away and who covers (their tasks show in the cover's list, nothing moves),
 * and the hand-over for somebody who leaves (every open task moves, once).
 */
export function CoverCard({
  covers,
  staff,
  today,
  canManage,
}: {
  covers: Cover[];
  staff: Person[];
  today: string;
  canManage: boolean;
}) {
  if (!canManage && covers.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Away &amp; cover</h2>
      </CardHeader>
      <CardContent className="grid gap-3">
        {covers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everybody is in.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {covers.map((c) => {
              const started = c.fromDate <= today;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{c.absent}</span>{" "}
                    {started ? "is away" : "will be away"} {c.fromDate}
                    {c.toDate ? ` → ${c.toDate}` : " (no end date)"} ·{" "}
                    <span className="font-medium">{c.cover}</span> covers · {c.open} open task
                    {c.open === 1 ? "" : "s"}
                  </span>
                  {canManage && <EndCover id={c.id} started={started} />}
                </li>
              );
            })}
          </ul>
        )}
        {canManage && (
          <>
            <AddCover staff={staff} today={today} />
            <HandOver staff={staff} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
