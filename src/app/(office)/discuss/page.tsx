import type { Metadata } from "next";
import { ModulePending } from "@/components/shared/module-pending";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Discuss" };

export default async function DiscussPage() {
  await requirePagePermission("app.discuss");
  return (
    <ModulePending
      title="Discuss"
      legacy="demo.html lines 8317–9050 (messages, templates, message guard) and 11550–12625 (chat, queue, calls)"
      scope={[
        "One message store: email, WhatsApp, internal chat, calls",
        "Routing by role, claim queue, escalation to Team lead",
        "Subject key [SB…/TOPIC] and auto-linking of refs",
        "Message guard: sender not on the file → red flag before reply",
        "Live updates via Redis pub/sub instead of 5-second polling",
      ]}
    />
  );
}
