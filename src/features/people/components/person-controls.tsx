"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { type Role, ROLE_LABEL, ROLES } from "@/domain/permissions";
import { useToastedAction } from "@/hooks/use-action-toast";
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
  const [, roleAction, rolePending] = useToastedAction(changeRole);
  const [, activeAction, activePending] = useToastedAction(setActive);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ActionForm action={roleAction} className="flex items-center gap-2">
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
      </ActionForm>
      <ActionForm action={activeAction}>
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
      </ActionForm>
    </div>
  );
}
