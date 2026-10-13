import { type BoxGoods, cargoKgOf } from "@/domain/goods";
import { type BoxOwner, ownerOf } from "@/domain/lookups";
import { VgmBadge } from "./vgm-badge";

type Box = BoxGoods & {
  id: string;
  type: string;
  number: string | null;
  loadingMode: string | null;
  tareKg: number | null;
};

/** The boxes for someone who may not edit them: number, owner, loading mode and the VGM. */
export function ContainersReadOnly({
  boxes,
  owners,
  specs,
}: {
  boxes: Box[];
  owners: readonly BoxOwner[];
  specs: Record<string, { tareKg: number; maxGrossKg: number }>;
}) {
  return (
    <div className="grid gap-2">
      {boxes.map((c, i) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <span>
            #{i + 1} · {c.type} · <span className="font-mono">{c.number ?? "—"}</span>
            {ownerOf(owners, c.number) && (
              <span className="text-muted-foreground"> · {ownerOf(owners, c.number)}</span>
            )}
            {c.loadingMode && <span className="text-muted-foreground"> · {c.loadingMode}</span>}
          </span>
          <VgmBadge type={c.type} cargoKg={cargoKgOf(c)} tareKg={c.tareKg} specs={specs} />
        </div>
      ))}
    </div>
  );
}
