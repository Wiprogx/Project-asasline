import "server-only";
import type { FxRates } from "@/domain/fx";
import { requirePermission } from "@/server/auth/dal";
import { readBooks } from "@/server/books-config";

/** The office's rates (Settings › Accounting, legacy BOOKS.fx): what a new USD or GBP document starts from. */
export async function fxRates(): Promise<FxRates> {
  await requirePermission("app.accounting");
  return (await readBooks()).fx;
}
