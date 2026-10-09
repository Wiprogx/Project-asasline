import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ContactFiles } from "@/features/contacts/components/contact-files";
import { filesOfContact } from "@/features/contacts/file-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Contact documents" };

/** Every paper on the contact's file (legacy contact documents tab). */
export default async function ContactDocumentsPage({
  params,
}: PageProps<"/contacts/[id]/documents">) {
  await requirePagePermission("app.contacts");
  const rows = await filesOfContact((await params).id);
  return (
    <Card>
      <CardContent className="pt-2">
        <ContactFiles rows={rows} />
      </CardContent>
    </Card>
  );
}
