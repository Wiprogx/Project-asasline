import { ToneBadge } from "@/components/shared/tone-badge";
import type { Requirement } from "@/domain/files";
import type { Tone } from "@/domain/shipments";

const STATE: Record<Requirement["state"], [label: string, tone: Tone]> = {
  missing: ["Missing", "danger"],
  draft: ["Draft", "warning"],
  final: ["Filed", "success"],
};

/** The papers the shipment must hold, and whether each is there (legacy reqDocsOf). */
export function RequirementsList({ reqs }: { reqs: Requirement[] }) {
  if (reqs.length === 0)
    return <p className="text-sm text-muted-foreground">No paper is required yet.</p>;
  return (
    <ul className="grid gap-1 text-sm">
      {reqs.map((r) => {
        const settled = r.stepStatus === "done";
        const waits = r.stepStatus === "waiting" && r.state === "missing";
        const [label, tone] =
          settled && r.state === "missing" ? ["Step done", "neutral" as Tone] : STATE[r.state];
        return (
          <li key={r.code} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {r.label}
              {r.source === "destination" && (
                <span className="text-muted-foreground"> · required by the destination</span>
              )}
            </span>
            {waits ? (
              <ToneBadge tone="neutral">Not yet</ToneBadge>
            ) : (
              <ToneBadge tone={tone}>{label}</ToneBadge>
            )}
          </li>
        );
      })}
    </ul>
  );
}
