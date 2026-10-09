import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

/**
 * What the service worker shows when a navigation cannot reach the server. Static on purpose:
 * no session, no data, nothing to go stale — it lives outside (office) so the layout's sign-in
 * check does not run, and the proxy lets it through.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-sm text-muted-foreground">
        The office could not be reached. Nothing you typed was sent; check the connection and try
        again.
      </p>
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Try again
      </Link>
    </main>
  );
}
