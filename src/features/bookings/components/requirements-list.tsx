import { ToneBadge } from "@/components/shared/tone-badge";
import type { Requirement } from "@/domain/files";
import type { Tone } from "@/domain/shipments";
import { RequirementActions } from "./requirement-actions";
import { type Checklist } from "@/domain/checklists";

const STATE: Record<Requirement["state"], [label: string, tone: Tone]> = {
  missing: ["Missing", "danger"],
  draft: ["Draft", "warning"],
  final: ["Filed", "success"],
  checked: ["Checked ✓", "success"],
  sent_back: ["Sent back", "danger"],
};

/** The papers the shipment must hold, whether each is there, and the office's word on it (legacy reqDocsOf). */
export function RequirementsList({
  reqs,
  bookingId,
  canEdit,
  reviewed = {},
  checklists = [],
}: {
  reqs: Requirement[];
  bookingId: string;
  canEdit: boolean;
  /** Who gave the word on a paper and when, by code. */
  reviewed?: Record<string, string>;
  /** The lists a paper may be checked against (Settings › Checklists). */
  checklists?: Checklist[];
}) {
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
          <li key={r.code} className="grid gap-1 border-b py-2 last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {r.label}
                {r.source === "destination" && (
                  <span className="text-muted-foreground"> · required by the destination</span>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {waits ? (
                  <ToneBadge tone="neutral">Not yet</ToneBadge>
                ) : (
                  <ToneBadge tone={tone}>{label}</ToneBadge>
                )}
                {canEdit && !waits && (
                  <RequirementActions
                    bookingId={bookingId}
                    code={r.code}
                    state={r.state}
                    list={checklists.find((l) => l.key === r.checklist) ?? null}
                  />
                )}
              </span>
            </div>
            {(r.state === "checked" || r.state === "sent_back") && (
              <p className="text-xs text-muted-foreground">
                {r.state === "sent_back" ? "Sent back" : "Checked"}
                {r.note && ` — ${r.note}`}
                {reviewed[r.code] && ` · ${reviewed[r.code]}`}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
