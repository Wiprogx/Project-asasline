import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { lineItemLines } from "@/domain/line-items";
import { lineItemsForEdit } from "@/features/settings-tables/item-queries";
import { saveLineItems } from "@/features/settings-tables/lookup-actions";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Line items" };

/** The general items a line of an invoice or a bill can be (legacy GL_ITEMS and SALE_ITEMS). */
export default async function LineItemsPage() {
  await requirePagePermission("app.settings");
  const { items, version } = await lineItemsForEdit();
  return (
    <LinesEditor
      action={saveLineItems}
      title="Line items"
      description={
        'One item per line: "id | sale or purchase | name | account | VAT code". A purchase item is an office cost booked where it says (230000 makes an asset, depreciated); a sale item is income that is not a shipment. The catalogue\'s services are offered on every line besides these.'
      }
      label="Line items, one per line"
      submitLabel="Save line items"
      lines={lineItemLines(items)}
      version={version}
      count={items.length}
    />
  );
}
