import { Building2Icon, MapPinIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON = { company: Building2Icon, person: UserIcon, location: MapPinIcon } as const;
const LABEL = { company: "Company", person: "Person", location: "Location" } as const;

/** The type at a glance — a building, a person, a pin — named for a screen reader too. */
export function ContactTypeIcon({ type, className }: { type: string; className?: string }) {
  const t = (type in ICON ? type : "company") as keyof typeof ICON;
  const Icon = ICON[t];
  return (
    <Icon
      role="img"
      aria-label={LABEL[t]}
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  );
}
