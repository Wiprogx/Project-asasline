import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ContactHistory } from "@/features/contacts/components/contact-history";
import { contactHistory } from "@/features/contacts/history-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Contact history" };

export default async function ContactHistoryPage({ params }: PageProps<"/contacts/[id]/history">) {
  await requirePagePermission("app.contacts");
  const rows = await contactHistory((await params).id);
  return (
    <Card>
      <CardContent className="pt-4">
        <ContactHistory rows={rows} />
      </CardContent>
    </Card>
  );
}
