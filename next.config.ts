import type { NextConfig } from "next";

// Files on a booking come in through a server action (25 MB, domain/files MAX_FILE_BYTES).
const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
};

export default nextConfig;
