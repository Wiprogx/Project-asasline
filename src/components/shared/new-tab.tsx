import { ExternalLinkIcon } from "lucide-react";

/**
 * Goes inside a link that opens a new tab: a reader hears it, a sighted person sees the icon
 * (WCAG 3.2.5). The link itself still carries `target="_blank" rel="noopener"`.
 */
export function NewTab() {
  return (
    <>
      <ExternalLinkIcon aria-hidden className="ml-1 inline size-3.5 align-[-2px]" />
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );
}
