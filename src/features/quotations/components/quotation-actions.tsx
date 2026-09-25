import { buttonVariants } from "@/components/ui/button";
import type { getQuotation, quotationLetter } from "../queries";
import { PresentationSwitch } from "./presentation-switch";
import { SendQuotation } from "./send-quotation";

type Quotation = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;
type Letter = Awaited<ReturnType<typeof quotationLetter>>;

/** How the customer sees the price, the printed quotation, and sending it. */
export function QuotationActions({ q, letter }: { q: Quotation; letter: Letter }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PresentationSwitch quotationId={q.id} version={q.version} display={q.display} />
      <a
        href={`/print/quotations/${q.id}`}
        target="_blank"
        rel="noopener"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Print / PDF
      </a>
      <SendQuotation
        quotationId={q.id}
        version={q.version}
        refLabel={q.ref}
        sent={!!q.sentOn}
        letter={letter}
      />
    </div>
  );
}
