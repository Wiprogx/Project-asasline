/**
 * Roles and the permission matrix, as in the legacy `perms` table (Admin, Docs clerk,
 * Accountant, Team lead). Rules store roles, never people: a role is resolved to a person
 * at fire time (invariant 3).
 */
export const ROLES = ["admin", "docs_clerk", "accountant", "team_lead"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  docs_clerk: "Docs clerk",
  accountant: "Accountant",
  team_lead: "Team lead",
};

type Grant = readonly [admin: 0 | 1, docs: 0 | 1, accountant: 0 | 1, lead: 0 | 1];

export const PERMISSIONS = {
  "app.quotations": [1, 1, 1, 1],
  "app.bookings": [1, 1, 1, 1],
  "app.contacts": [1, 1, 1, 1],
  "app.discuss": [1, 1, 1, 1],
  "app.activity": [1, 1, 1, 1],
  "app.accounting": [1, 0, 1, 1],
  "app.settings": [1, 0, 0, 0],
  "bookings.edit": [1, 1, 0, 1],
  "bookings.cancel": [1, 0, 0, 0],
  "costs.view": [1, 0, 1, 1],
  "documents.upload": [1, 1, 0, 1],
  "audit.view": [1, 0, 0, 1],
  "accounting.issue": [1, 0, 1, 1],
  "accounting.bank": [1, 0, 1, 0],
  "accounting.approve": [1, 0, 1, 0],
  "accounting.closePeriods": [1, 0, 1, 0],
  "activity.cover": [1, 0, 0, 1],
  "catalogue.edit": [1, 0, 1, 1],
} as const satisfies Record<string, Grant>;

export type Permission = keyof typeof PERMISSIONS;
export type PermissionMatrix = Record<Permission, Grant>;

/**
 * Fail closed: an unknown role or permission is a "no", never a silent Admin fallback. The
 * matrix is the built-in one unless the office edited its own (Settings › Permissions).
 */
export function can(
  role: Role | null | undefined,
  permission: Permission,
  matrix: PermissionMatrix = PERMISSIONS,
): boolean {
  if (!role) return false;
  const i = ROLES.indexOf(role);
  const grant: Grant | undefined = matrix[permission];
  return i >= 0 && grant?.[i] === 1;
}

/** What a signed-in person may do, under the office's own matrix when it carries one. */
export const may = (
  user: { role: Role; matrix?: PermissionMatrix },
  permission: Permission,
): boolean => can(user.role, permission, user.matrix);

/** The Admin must keep Settings, or nobody could ever put a permission back. */
export function matrixProblem(matrix: PermissionMatrix): string | null {
  return matrix["app.settings"]?.[0] === 1
    ? null
    : "The Admin must keep Settings: without it nobody could put a permission back.";
}
