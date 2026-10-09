import Link from "next/link";
import type { ReactNode } from "react";
import { ToneBadge } from "@/components/shared/tone-badge";
import { CHANNEL_LABEL } from "@/domain/messages";
import type { MessageRow } from "../queries";
import { formatStamp } from "@/lib/stamp";
import { NewTab } from "@/components/shared/new-tab";

function who(m: MessageRow) {
  if (m.direction === "internal") return m.author ?? "someone";
  if (m.direction === "in") return m.contactName ?? m.fromText ?? "unknown sender";
  return `${m.author ?? "we"} → ${m.contactName ?? m.toText ?? "?"}`;
}

/** One message, whatever its channel: who, when, about what, and anything to watch for. */
export function MessageItem({ m, actions }: { m: MessageRow; actions?: ReactNode }) {
  return (
    <li className="grid gap-1 border-b py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2 text-sm">
          {m.direction !== "internal" && (
            <ToneBadge tone="neutral">{CHANNEL_LABEL[m.channel]}</ToneBadge>
          )}
          <span className="font-medium">{who(m)}</span>
          <span className="font-mono text-xs text-muted-foreground">{formatStamp(m.at)}</span>
          {m.linkRef && m.linkKind === "booking" && (
            <Link
              href={`/bookings/${m.linkId}/messages`}
              className="font-mono text-xs hover:underline"
            >
              {m.linkRef}
            </Link>
          )}
          {m.linkRef && m.linkKind === "quotation" && (
            <Link href={`/quotations/${m.linkId}`} className="font-mono text-xs hover:underline">
              {m.linkRef}
            </Link>
          )}
          {m.stranger && (
            <ToneBadge tone="danger">
              ⚠ Sender is not a party on {m.linkRef} — check before replying
            </ToneBadge>
          )}
          {m.direction === "out" && !m.deliveredAt && (
            <ToneBadge tone="warning">Recorded — not sent by the app</ToneBadge>
          )}
          {m.channel === "call" && m.callOutcome && (
            <ToneBadge tone={m.callOutcome === "answered" ? "success" : "warning"}>
              {m.callOutcome}
              {m.callSeconds ? ` · ${Math.round(m.callSeconds / 60)} min` : ""}
            </ToneBadge>
          )}
          {m.claimedByName && (
            <span className="text-xs text-muted-foreground">taken by {m.claimedByName}</span>
          )}
        </span>
        {actions}
      </div>
      {m.subject && <span className="text-sm font-medium">{m.subject}</span>}
      {m.cc.length > 0 && (
        <span className="text-xs text-muted-foreground">cc: {m.cc.join(", ")}</span>
      )}
      {m.files.length > 0 && (
        <span className="flex flex-wrap gap-2 text-xs">
          {m.files.map((f) => (
            <a
              key={f.id}
              href={`/api/messages/${m.id}/files/${f.id}`}
              target="_blank"
              rel="noopener"
              className="underline"
            >
              📎 {f.name}
              <NewTab />
            </a>
          ))}
        </span>
      )}
      {m.body && (
        <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
          {m.body}
        </p>
      )}
    </li>
  );
}
