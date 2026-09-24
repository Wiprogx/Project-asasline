import type { Metadata } from "next";
import { PermissionsEditor } from "@/features/settings-tables/components/permissions-editor";
import { permissionsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Permissions" };

export default async function PermissionsPage() {
  await requirePagePermission("app.settings");
  const { matrix, version } = await permissionsForEdit();
  return <PermissionsEditor matrix={matrix} version={version} />;
}
