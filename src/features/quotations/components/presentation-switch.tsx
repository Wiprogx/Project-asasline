"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import {
  QUOTATION_DISPLAY_LABEL,
  QUOTATION_DISPLAYS,
  type QuotationDisplay,
} from "@/domain/quotation-doc";
import { useToastedAction } from "@/hooks/use-action-toast";
import { setDisplay, toggleListed } from "../send-actions";

/** Itemized or all-inclusive: how the customer's document shows the price. */
export function PresentationSwitch({
  quotationId,
  version,
  display,
}: {
  quotationId: string;
  version: number;
  display: QuotationDisplay;
}) {
  const [, run, pending] = useToastedAction(setDisplay);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Presentation">
      {QUOTATION_DISPLAYS.map((d) => (
        <ActionForm key={d} action={run}>
          <input type="hidden" name="quotationId" value={quotationId} />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="display" value={d} />
          <Button
            type="submit"
            size="sm"
            variant={d === display ? "default" : "outline"}
            aria-pressed={d === display}
            disabled={pending || d === display}
          >
            {QUOTATION_DISPLAY_LABEL[d]}
          </Button>
        </ActionForm>
      ))}
    </div>
  );
}

/** On an all-inclusive quotation: whether the document names this service. */
export function ListedToggle(p: {
  quotationId: string;
  version: number;
  lineId: string;
  listed: boolean;
}) {
  const [, run, pending] = useToastedAction(toggleListed);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="quotationId" value={p.quotationId} />
      <input type="hidden" name="version" value={p.version} />
      <input type="hidden" name="lineId" value={p.lineId} />
      <Button type="submit" size="sm" variant="ghost" aria-pressed={p.listed} disabled={pending}>
        {p.listed ? "Named" : "Not named"}
      </Button>
    </ActionForm>
  );
}
