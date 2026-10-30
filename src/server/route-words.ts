import "server-only";
import { withLabel } from "./lookups";
import { withPorts } from "./ports";

type RouteIds = { containerTypeId: string | null; polId: string | null; podId: string | null };

/**
 * A catalogue item's or a quotation destination's words as the domain reads them: its box code
 * as `containerType` and its ports' codes as `pol` and `pod`.
 */
export async function withRouteWords<T extends RouteIds>(rows: readonly T[]) {
  return withPorts(await withLabel(rows, "container-types", "containerTypeId", "containerType"));
}
