import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { lastMonthEnd } from "@/domain/assets";
import { OdooUpload } from "@/features/accounting/components/odoo-forms";
import { CloseBooksForm } from "@/features/accounting/components/vat-controls";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Odoo cut-over" };

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">
          {n}. {title}
        </h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Bringing Odoo's books over on the cut-over day, one export at a time, in this order. */
export default async function OdooPage() {
  await requirePagePermission("accounting.closePeriods");
  const cutoff = lastMonthEnd(officeToday());
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Odoo cut-over"
        description="What Odoo holds on the cut-over day comes over as CSV exports. Importing twice is harmless: what is already here is left alone."
      />
      <Step
        n={1}
        title="Contacts"
        hint="Contacts › Export (name, VAT, address, e-mail, bank account). Known contacts are completed, never overwritten."
      >
        <OdooUpload kind="contacts" label="Odoo contacts (CSV)" />
      </Step>
      <Step
        n={2}
        title="Open customer invoices"
        hint="Invoicing › Customers › Invoices, filtered on not paid, with Amount Due. Only the open part comes over, against 499000."
      >
        <OdooUpload kind="sale" label="Odoo open invoices (CSV)" cutoff={cutoff} />
      </Step>
      <Step
        n={3}
        title="Open supplier bills"
        hint="Invoicing › Vendors › Bills, filtered on not paid, with Amount Due."
      >
        <OdooUpload kind="purchase" label="Odoo open bills (CSV)" cutoff={cutoff} />
      </Step>
      <Step
        n={4}
        title="Trial balance"
        hint="Accounting › Reporting › Trial Balance on the cut-over day (Account, Debit, Credit). Customers and suppliers go to 499000, the year's result to 140000."
      >
        <OdooUpload kind="balances" label="Odoo trial balance (CSV)" cutoff={cutoff} />
      </Step>
      <Step
        n={5}
        title="Close the books through the cut-over day"
        hint="Nothing dated on or before it can change here afterwards."
      >
        <CloseBooksForm suggested={cutoff} />
      </Step>
    </div>
  );
}
