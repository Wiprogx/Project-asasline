import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { can, type Permission, type Role } from "@/domain/permissions";
import { readSessionUser } from "./session";

/**
 * The data-access layer's gate. Every query and action calls one of these; the proxy's
 * cookie check is only an optimistic redirect, never the authorisation.
 */
export type CurrentUser = { id: string; email: string; name: string; role: Role };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => readSessionUser());

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
  if (!can(user.role, permission)) throw new ForbiddenError(permission);
  return user;
}

/** For pages: sends the person home instead of rendering a screen they may not see. */
export async function requirePagePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/?denied=" + encodeURIComponent(permission));
  return user;
}
