import type { Metadata } from "next";
import { LOG_RANGES, logWindow } from "@/domain/access";
import { TimeTable } from "@/features/audit/components/time-table";
import { timeByApp } from "@/features/audit/time-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Time" };

/** Who worked where (legacy Settings › Time): the day by default, counted from real interaction. */
export default async function TimePage({ searchParams }: PageProps<"/settings/time">) {
  await requirePagePermission("audit.view");
  const sp = await searchParams;
  const range = LOG_RANGES.find((r) => r === sp.range) ?? "day";
  const window = logWindow(range, officeToday());
  const rows = await timeByApp(window);
  return (
    <>
      <div className="mb-4">
        <h2 className="font-heading text-base font-medium">Time at work</h2>
        <p className="text-sm text-muted-foreground">
          Each person&apos;s time per app, as the browser counted it while they worked.
        </p>
      </div>
      <TimeTable rows={rows} range={range} window={window} />
    </>
  );
}
