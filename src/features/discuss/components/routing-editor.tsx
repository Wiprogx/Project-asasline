"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Route } from "@/domain/messages";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveRouting } from "../routing-actions";

const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

/** Topic → role, on or off, and how long a message may wait before the Team lead sees it. */
export function RoutingEditor(p: {
  routes: Route[];
  version: number;
  minutes: number;
  escalationVersion: number;
}) {
  const [extra, setExtra] = useState(0);
  const [, run, pending] = useToastedAction(saveRouting);
  const rows: (Route & { fresh?: boolean })[] = [
    ...p.routes,
    ...Array.from({ length: extra }, () => ({
      code: "",
      subject: "",
      role: "team_lead" as const,
      active: true,
      fresh: true,
    })),
  ];
  return (
    <ActionForm action={run} className="grid gap-3" key={`${p.version}-${p.escalationVersion}`}>
      <input type="hidden" name="version" value={p.version} />
      <input type="hidden" name="escalationVersion" value={p.escalationVersion} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 font-normal">Topic</th>
            <th className="py-1 font-normal">What it is about</th>
            <th className="py-1 font-normal">Goes to</th>
            <th className="py-1 font-normal">On</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.fresh ? `new-${i}` : r.code}>
              <td className="py-1 pr-2">
                {r.fresh ? (
                  <Input name="code" aria-label={`Topic code ${i + 1}`} placeholder="CUSTOMS" />
                ) : (
                  <>
                    <input type="hidden" name="code" value={r.code} />
                    <span className="font-mono">{r.code}</span>
                  </>
                )}
              </td>
              <td className="py-1 pr-2">
                <Input
                  name="subject"
                  aria-label={`What ${r.code || "it"} is about`}
                  defaultValue={r.subject}
                />
              </td>
              <td className="py-1 pr-2">
                <NativeSelect
                  name="role"
                  aria-label={`${r.code || "New topic"} goes to`}
                  defaultValue={r.role}
                  options={roleOptions}
                />
              </td>
              <td className="py-1">
                <input
                  type="checkbox"
                  name={`active-${r.code}`}
                  defaultChecked={r.active}
                  aria-label={`${r.code || "New topic"} on`}
                  className="size-4"
                  disabled={r.fresh}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setExtra((n) => n + 1)}>
          + Topic
        </Button>
        <div className="flex flex-wrap items-end gap-2">
          <Field id="rt-minutes" label="Team lead sees it after (minutes)">
            <Input
              id="rt-minutes"
              name="minutes"
              type="number"
              min={5}
              max={1440}
              defaultValue={p.minutes}
              className="w-28"
            />
          </Field>
          <Button type="submit" disabled={pending}>
            Save routing
          </Button>
        </div>
      </div>
    </ActionForm>
  );
}
