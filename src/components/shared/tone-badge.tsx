import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/domain/shipments";
import { cn } from "@/lib/utils";

/** Traffic-light status (legacy): green not due · amber today · red overdue or blocking. */
const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  success: "bg-success/15 text-success",
};

export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <Badge variant="ghost" className={cn("font-medium", TONE[tone])}>
      {children}
    </Badge>
  );
}
