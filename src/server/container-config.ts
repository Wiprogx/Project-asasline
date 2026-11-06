import "server-only";
import { isNull } from "drizzle-orm";
import type { BoxOwner, ContainerSpec } from "@/domain/lookups";
import { cached, tags } from "./cache/cache";
import { db } from "./db/client";
import { boxOwners, containerTypes } from "./db/schema";

/**
 * Tare and maximum gross per ISO type (legacy CONTAINER_TARE / CONTAINER_MAX): the two columns
 * of Settings › Lists › Container types, read for every row — a box keeps pointing at an
 * archived type, and its VGM still needs the type's tare. A type without them is left out: the
 * VGM then says the tare is unknown rather than guessing.
 */
export const readContainerSpecs = (): Promise<ContainerSpec[]> =>
  cached(
    "container-specs:v2",
    { ttlSeconds: 600, tags: [tags.lookups("container-types")] },
    async () => {
      const rows = await db
        .select({
          type: containerTypes.label,
          tareKg: containerTypes.tareKg,
          maxGrossKg: containerTypes.maxGrossKg,
        })
        .from(containerTypes);
      return rows.filter((r): r is ContainerSpec => r.tareKg !== null && r.maxGrossKg !== null);
    },
  );

/** Who owns a box by its prefix (legacy BOX_OWNERS): the live rows of Settings › Lists › Box owners. */
export const readBoxOwners = (): Promise<BoxOwner[]> =>
  cached("box-owners:v2", { ttlSeconds: 600, tags: [tags.lookups("box-owners")] }, () =>
    db
      .select({ prefix: boxOwners.label, owner: boxOwners.owner })
      .from(boxOwners)
      .where(isNull(boxOwners.archivedAt)),
  );
