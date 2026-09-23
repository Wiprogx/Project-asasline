"use client";

import { useActionState } from "react";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { type Role, ROLE_LABEL, ROLES } from "@/domain/permissions";
import { useActionToast } from "@/hooks/use-action-toast";
import { IDLE } from "@/lib/action-result";
import { changeRole, setActive } from "../actions";

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export function PersonControls({
  id,
  role,
  active,
  isSelf,
}: {
  id: string;
  role: Role;
  active: boolean;
  isSelf: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState(changeRole, IDLE);
  const [activeState, activeAction, activePending] = useActionState(setActive, IDLE);
  useActionToast(roleState);
  useActionToast(activeState);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={roleAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <NativeSelect
          key={role}
          name="role"
          defaultValue={role}
          aria-label="Role"
          className="w-36"
          options={ROLE_OPTIONS}
          disabled={isSelf || !active}
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isSelf || !active || rolePending}
        >
          Set
        </Button>
      </form>
      <form action={activeAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={String(!active)} />
        <Button
          type="submit"
          size="sm"
          variant={active ? "destructive" : "outline"}
          disabled={isSelf || activePending}
        >
          {active ? "Switch off" : "Switch on"}
        </Button>
      </form>
    </div>
  );
}
