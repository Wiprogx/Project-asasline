import type { Metadata } from "next";
import { portLines } from "@/domain/ports";
import { savePorts } from "@/features/settings-tables/actions";
import { LinesEditor } from "@/features/settings-tables/components/lines-editor";
import { portsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Ports" };

export default async function PortsPage() {
  await requirePagePermission("app.settings");
  const { ports, version } = await portsForEdit();
  return (
    <LinesEditor
      action={savePorts}
      title="Ports"
      description='One per line: the UN/LOCODE, the name, the country — "BEANR Antwerp BE". Offered on every port field as you type; a code not in the list is still accepted. The destination country of a booking is read from its port code.'
      label="Ports, one per line"
      lines={portLines(ports)}
      version={version}
      count={ports.length}
    />
  );
}
