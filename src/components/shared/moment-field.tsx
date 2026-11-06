"use client";

import { useState } from "react";
import { Field } from "./field";
import { MomentInput } from "./moment-input";

/**
 * A labelled date-and-hour field for a plain form: it starts from what the record holds and
 * posts the day under `dateName` (the id unless said) and the hour under `timeName`
 * (`<dateName>Time` unless said), so the server reads two strings as it always did.
 */
export function MomentField({
  id,
  label,
  hint,
  date,
  time,
  dateName = id,
  timeName = `${dateName}Time`,
  error,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  date: string | null;
  time: string | null;
  dateName?: string;
  timeName?: string;
  error?: string[];
  className?: string;
}) {
  const [at, setAt] = useState({ date, time });
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <MomentInput
        id={id}
        date={at.date}
        time={at.time}
        onChange={(d, t) => setAt({ date: d, time: t })}
        dateName={dateName}
        timeName={timeName}
      />
    </Field>
  );
}
