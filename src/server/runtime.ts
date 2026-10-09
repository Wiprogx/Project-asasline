import "server-only";
import { env } from "@/env";

/** Whether this is the built app, not `next dev`: the service worker registers only then. */
export const isProduction = env.NODE_ENV === "production";
