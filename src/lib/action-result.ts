import type { z } from "zod";

/** What every server action returns: the form renders `error` / `fieldErrors`, never throws. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export const IDLE: ActionResult<never> = { ok: false, error: "" };

export function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Please correct the highlighted fields.", fieldErrors };
}

export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** FormData → plain object; empty strings become undefined so optional fields stay optional. */
export function formToObject(fd: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    out[k] = t === "" ? undefined : t;
  }
  return out;
}

/**
 * For updates: an optional field the person emptied arrives as `undefined`, which Drizzle
 * silently skips — the old value would survive. Every listed key missing from `data` becomes
 * null, so clearing a field really clears it.
 */
export function nullMissing(data: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = { ...data };
  for (const k of keys) if (out[k] === undefined) out[k] = null;
  return out;
}
