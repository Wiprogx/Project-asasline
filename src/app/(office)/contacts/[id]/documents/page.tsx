import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ContactFileForm } from "@/features/contacts/components/contact-file-form";
import { ContactFiles } from "@/features/contacts/components/contact-files";
import { filesOfContact } from "@/features/contacts/file-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Contact documents" };

/** The contact's own papers and every paper on its file (legacy contact documents tab). */
export default async function ContactDocumentsPage({
  params,
}: PageProps<"/contacts/[id]/documents">) {
  await requirePagePermission("app.contacts");
  const { id } = await params;
  const [rows, kinds] = await Promise.all([filesOfContact(id), readConfig("contactDocTypes")]);
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-4">
          <ContactFileForm contactId={id} kinds={kinds} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-2">
          <ContactFiles rows={rows} canRemove />
        </CardContent>
      </Card>
    </div>
  );
}
