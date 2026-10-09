import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NOTIFY_LEVELS } from "@/domain/notify";

const TONE = { stop: "danger", today: "warning", news: "neutral" } as const;

/** How the office is told (legacy NOTIFY_LEVELS): three levels, read from the rules, never set by hand. */
export function NotifyLevelsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How people are told</CardTitle>
        <CardDescription>
          A task reaches its owner; what merely happened is written in the history; nothing is ever
          sent to everybody. The level is read from the rule that made the task.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm">
          {NOTIFY_LEVELS.map((l) => (
            <li key={l.key} className="grid gap-0.5 sm:grid-cols-[11rem_1fr]">
              <span>
                <ToneBadge tone={TONE[l.key]}>{l.label}</ToneBadge>
              </span>
              <span>
                {l.how}
                <span className="block text-xs text-muted-foreground">{l.eg}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
