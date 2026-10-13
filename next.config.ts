import type { NextConfig } from "next";

// Files on a booking come in through a server action (25 MB, domain/files MAX_FILE_BYTES).
const nextConfig: NextConfig = {
  // The browser suite builds into its own folder (playwright.config: NEXT_DIST_DIR=.next-e2e), so
  // it can run while `npm run dev` serves the office from .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
  async headers() {
    return [
      {
        // The browser re-checks the worker on every load; a cached one would outlive a deploy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
