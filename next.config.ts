import type { NextConfig } from "next";

// Files on a booking come in through a server action (25 MB, domain/files MAX_FILE_BYTES).
const nextConfig: NextConfig = {
  // The browser suite builds into its own folder (playwright.config: NEXT_DIST_DIR=.next-e2e), so
  // it can run while `npm run dev` serves the office from .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The dev server refuses its scripts to any host but localhost: from another computer on the
  // office network (http://192.168.x.x:3000) the page loads but nothing on it works. Allowed:
  // the private network, and any host names listed in DEV_ORIGINS (comma-separated).
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    ...(process.env.DEV_ORIGINS ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  ],
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
