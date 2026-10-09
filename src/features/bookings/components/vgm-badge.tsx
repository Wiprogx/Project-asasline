import { ToneBadge } from "@/components/shared/tone-badge";
import { formatKg, vgm } from "@/domain/container";

/** VGM at a glance: unknown is shown as unknown (fail closed), over the maximum in red. */
export function VgmBadge({
  type,
  cargoKg,
  tareKg,
  specs,
}: {
  type: string;
  cargoKg: number | null;
  tareKg: number | null;
  /** Tare and maximum gross per type (Settings › Containers). */
  specs: Record<string, { tareKg: number; maxGrossKg: number }>;
}) {
  const v = vgm({ type, cargoKg, tareKg }, specs);
  if (v.state === "unknown") return <ToneBadge tone="warning">VGM unknown · {v.reason}</ToneBadge>;
  const max = v.maxGrossKg ? ` / max ${formatKg(v.maxGrossKg)}` : "";
  return (
    <ToneBadge tone={v.state === "over" ? "danger" : "success"}>
      VGM {formatKg(v.grossKg)}
      {max}
      {v.tareFrom === "type" && " · tare from type"}
    </ToneBadge>
  );
}
