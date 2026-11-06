"use client";

import { Input } from "@/components/ui/input";
import { joinMoment, QUARTER_HOUR_SECONDS, splitMoment } from "@/domain/moments";

/**
 * A day and an hour asked as one field (legacy dtPair): the browser's date-and-time control
 * stepping by the quarter hour. The value stays two strings, the "YYYY-MM-DD" day and the
 * "HH:MM" hour (invariant 4); a form that posts them under two names gets both as hidden
 * fields, so the server reads what it always did. A day whose hour is not known shows at
 * midnight until an hour is typed; clearing the field clears both.
 */
export function MomentInput({
  id,
  date,
  time,
  onChange,
  dateName,
  timeName,
  className,
  ...aria
}: {
  id: string;
  date: string | null;
  time: string | null;
  onChange: (date: string | null, time: string | null) => void;
  /** The names the day and the hour post under; none: the field is read from state alone. */
  dateName?: string;
  timeName?: string;
  className?: string;
  required?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <>
      <Input
        id={id}
        type="datetime-local"
        step={QUARTER_HOUR_SECONDS}
        value={joinMoment(date, time)}
        onChange={(e) => {
          const m = splitMoment(e.target.value);
          onChange(m.date, m.time);
        }}
        className={className}
        {...aria}
      />
      {dateName && <input type="hidden" name={dateName} value={date ?? ""} />}
      {timeName && <input type="hidden" name={timeName} value={time ?? ""} />}
    </>
  );
}
