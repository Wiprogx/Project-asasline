import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { paymentTermLines, TERM_RULES } from "@/domain/accounting-settings";
import { saveBankAccounts, savePaymentTerms } from "@/features/settings-tables/accounting-actions";
import { BooksSettingsForm } from "@/features/settings-tables/components/books-settings-form";
import { SequenceForm } from "@/features/settings-tables/components/sequence-form";
import { accountingSettingsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { bankAccountLines } from "@/domain/bank-accounts";

export const metadata: Metadata = { title: "Accounting settings" };

const TERMS_DESCRIPTION = `When an invoice is due, one term per line: "id | Name | rule | days". Rules: ${TERM_RULES.join(", ")} — only "days" counts from the issue day; the others print their words on the invoice. Offered on a contact and on a quotation.`;

/** Payment terms, the books' two figures and the numbering (legacy Accounting › settings). */
export default async function AccountingSettingsPage() {
  await requirePagePermission("app.settings");
  const { terms, books, bank, sequences } = await accountingSettingsForEdit();
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
      <LinesEditor
        action={saveBankAccounts}
        title="Bank accounts"
        description={
          "The office's accounts, one per line: \"Name | IBAN | BIC | ledger account (55…) | balance when the books started | on\". The Bank screen compares each account's statements with the books."
        }
        label="Bank accounts, one per line"
        submitLabel="Save bank accounts"
        lines={bankAccountLines(bank.accounts)}
        version={bank.version}
        count={bank.accounts.length}
      />
      <SequenceForm rows={sequences} />
    </div>
  );
}
