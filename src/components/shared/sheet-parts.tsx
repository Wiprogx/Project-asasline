import type { Row } from "@/domain/booking-doc";

/** Label-over-value cells on a printed sheet, four to a row (legacy f4), or two. */
export function RowGrid({ rows, cols = 4 }: { rows: Row[]; cols?: 2 | 4 }) {
  return (
    <dl
      className={`grid gap-x-4 gap-y-2 text-sm ${cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}
    >
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[10px] tracking-wide text-neutral-500 uppercase">{k}</dt>
          <dd className="whitespace-pre-line">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A section's title on a printed sheet. */
export function SheetTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-center text-sm font-bold tracking-wide uppercase">{children}</h2>;
}
