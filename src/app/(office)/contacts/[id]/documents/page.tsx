import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ContactUploader } from "@/features/contacts/components/contact-uploader";
import { ContactFiles } from "@/features/contacts/components/contact-files";
import { filesOfContact } from "@/features/contacts/file-queries";
import { getContact } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { liveLookups } from "@/server/lookups";

export const metadata: Metadata = { title: "Contact documents" };

/** The contact's own papers and every paper on its file (legacy contact documents tab). */
export default async function ContactDocumentsPage({
  params,
}: PageProps<"/contacts/[id]/documents">) {
  await requirePagePermission("app.contacts");
  const { id } = await params;
  const [rows, kinds, contact] = await Promise.all([
    filesOfContact(id),
    liveLookups("contact-doc-kinds").then((o) => o.map((x) => x.label)),
    getContact(id),
  ]);
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-4">
          <ContactUploader contactId={id} kinds={kinds} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-2">
          <ContactFiles rows={rows} contactId={id} email={contact?.email ?? null} canRemove />
        </CardContent>
      </Card>
    </div>
  );
}
