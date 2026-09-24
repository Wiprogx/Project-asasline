import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { may, type Permission, type PermissionMatrix, type Role } from "@/domain/permissions";
import { readPermissions } from "../permission-config";
import { readSessionUser } from "./session";

/**
 * The data-access layer's gate. Every query and action calls one of these; the proxy's
 * cookie check is only an optimistic redirect, never the authorisation. The person carries
 * the office's permission matrix, so screens and gates read the same one.
 */
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  matrix: PermissionMatrix;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const row = await readSessionUser();
  if (!row) return null;
  return { ...row, matrix: await readPermissions() };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`You do not have permission: ${permission}`);
  }
}

/** For server actions and queries: throws, so the caller cannot forget to stop. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!may(user, permission)) throw new ForbiddenError(permission);
  return user;
}

/** For pages: sends the person home instead of rendering a screen they may not see. */
export async function requirePagePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!may(user, permission)) redirect("/?denied=" + encodeURIComponent(permission));
  return user;
}
