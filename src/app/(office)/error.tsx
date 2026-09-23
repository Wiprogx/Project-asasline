"use client";

import { Button } from "@/components/ui/button";

export default function OfficeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="grid max-w-lg gap-3 py-10">
      <h2 className="text-lg font-semibold">Something went wrong on this screen.</h2>
      <p className="text-sm text-muted-foreground">
        {error.message.startsWith("You do not have permission")
          ? error.message
          : "Your last change may not be saved."}
        {error.digest && <span className="font-mono"> (ref {error.digest})</span>}
      </p>
      <div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
