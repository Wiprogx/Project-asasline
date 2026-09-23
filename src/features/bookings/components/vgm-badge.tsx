import { ToneBadge } from "@/components/shared/tone-badge";
import { vgm } from "@/domain/container";

const kg = (n: number) => `${n.toLocaleString("en-BE")} kg`;

/** VGM at a glance: unknown is shown as unknown (fail closed), over the maximum in red. */
export function VgmBadge({
  type,
  cargoKg,
  tareKg,
}: {
  type: string;
  cargoKg: number | null;
  tareKg: number | null;
}) {
  const v = vgm({ type, cargoKg, tareKg });
  if (v.state === "unknown") return <ToneBadge tone="warning">VGM unknown · {v.reason}</ToneBadge>;
  const max = v.maxGrossKg ? ` / max ${kg(v.maxGrossKg)}` : "";
  return (
    <ToneBadge tone={v.state === "over" ? "danger" : "success"}>
      VGM {kg(v.grossKg)}
      {max}
      {v.tareFrom === "type" && " · tare from type"}
    </ToneBadge>
  );
}
