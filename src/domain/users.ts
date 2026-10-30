import type { Role } from "./permissions";

/**
 * Staff rules from the legacy Settings › People screen: people are switched off, never
 * deleted; nobody switches themselves off; the office always keeps one active Admin, because
 * Admin is the only role that can open Settings to repair the situation.
 */
export const MIN_PASSWORD_LENGTH = 10;

type Person = { id: string; role: Role; active: boolean };

/** Why this change must be refused, or null when it may go ahead. */
export function staffChangeRefusal(
  actorId: string,
  target: Person,
  change: { role?: Role; active?: boolean },
  activeAdmins: number,
): string | null {
  const switchingOff = change.active === false && target.active;
  if (switchingOff && target.id === actorId) return "You cannot switch yourself off.";

  const losesAdmin =
    target.active &&
    target.role === "admin" &&
    (switchingOff || (change.role !== undefined && change.role !== "admin"));
  if (losesAdmin && activeAdmins <= 1) return "The office must keep at least one active Admin.";

  if (target.id === actorId && change.role !== undefined && change.role !== target.role)
    return "Ask another Admin to change your own role.";
  return null;
}
