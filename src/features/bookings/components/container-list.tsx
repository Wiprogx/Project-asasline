import type { ReactNode } from "react";
import { cargoKgOf } from "@/domain/goods";
import { ownerOf } from "@/domain/lookups";
import { AddContainer } from "./add-container";
import { type Box, type BoxLists, ContainerRow } from "./container-row";
import { VgmBadge } from "./vgm-badge";

/** The boxes of a booking for someone who may edit them: "Add container", then one form each. */
export function ContainerList({
  bookingId,
  boxes,
  lists,
  notes,
}: {
  bookingId: string;
  boxes: readonly Box[];
  lists: BoxLists;
  /** What to say beside each box, by its index: how it measures against its mode. */
  notes: readonly (ReactNode | null)[];
}) {
  return (
    <>
      <div className="flex justify-end">
        <AddContainer bookingId={bookingId} types={lists.types} />
      </div>
      {boxes.map((c, i) => (
        <ContainerRow
          key={c.id}
          box={c}
          index={i}
          bookingId={bookingId}
          lists={lists}
          canRemove={boxes.length > 1}
        >
          {ownerOf(lists.owners, c.number) && (
            <span className="text-xs text-muted-foreground">{ownerOf(lists.owners, c.number)}</span>
          )}
          <VgmBadge type={c.type} cargoKg={cargoKgOf(c)} tareKg={c.tareKg} specs={lists.specs} />
          {notes[i] && <span className="text-xs">{notes[i]}</span>}
        </ContainerRow>
      ))}
    </>
  );
}
