import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { paymentTermLines, TERM_RULES } from "@/domain/accounting-settings";
import { savePaymentTerms } from "@/features/settings-tables/accounting-actions";
import { BooksSettingsForm } from "@/features/settings-tables/components/books-settings-form";
import { SequenceForm } from "@/features/settings-tables/components/sequence-form";
import { accountingSettingsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Accounting settings" };

const TERMS_DESCRIPTION = `When an invoice is due, one term per line: "id | Name | rule | days". Rules: ${TERM_RULES.join(", ")} — only "days" counts from the issue day; the others print their words on the invoice. Offered on a contact and on a quotation.`;

/** Payment terms, the books' two figures and the numbering (legacy Accounting › settings). */
export default async function AccountingSettingsPage() {
  await requirePagePermission("app.settings");
  const { terms, books, sequences } = await accountingSettingsForEdit();
  return (
    <div className="grid gap-4">
      <BooksSettingsForm books={books.books} version={books.version} />
      <LinesEditor
        action={savePaymentTerms}
        title="Payment terms"
        description={TERMS_DESCRIPTION}
        label="Payment terms, one per line"
        submitLabel="Save payment terms"
        lines={paymentTermLines(terms.terms)}
        version={terms.version}
        count={terms.terms.length}
      />
      <SequenceForm rows={sequences} />
    </div>
  );
}
