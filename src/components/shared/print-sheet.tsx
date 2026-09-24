import type { ReactNode } from "react";
import { COMPANY } from "@/domain/company";

/**
 * A printed document (legacy docHdr/docFtr): the letterhead, the body, the footer the law
 * asks for. Outside the office shell, light on paper; the browser's print makes the PDF.
 */
export function PrintSheet({
  kind,
  number,
  bank = false,
  children,
}: {
  kind: string;
  number: string;
  /** Invoices carry the bank line; a quotation or a booking copy does not. */
  bank?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto grid max-w-3xl gap-8 bg-white p-10 text-neutral-900">
      <header className="flex items-start justify-between gap-4 border-b-2 border-[#c9a961] pb-4">
        <div>
          <div className="text-2xl font-bold tracking-wide text-[#0a2540]">{COMPANY.name}</div>
          <div className="text-xs tracking-widest text-[#c9a961] uppercase">{COMPANY.tag}</div>
          <div className="mt-1 text-xs">{COMPANY.address}</div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-semibold">{kind}</h1>
          <div className="font-mono">{number}</div>
        </div>
      </header>
      {children}
      <footer className="border-t pt-3 text-center text-[11px] leading-5 text-neutral-600">
        Tel {COMPANY.tel} · {COMPANY.email} · {COMPANY.web} · VAT {COMPANY.vat}
        {bank && (
          <>
            <br />
            {COMPANY.bank} · IBAN {COMPANY.iban} · BIC {COMPANY.bic}
          </>
        )}
      </footer>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.addEventListener('load',()=>setTimeout(()=>window.print(),300))",
        }}
      />
    </main>
  );
}
