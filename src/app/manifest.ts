import type { MetadataRoute } from "next";

/**
 * The installable app (served at /manifest.webmanifest, linked by Next). The office opens it
 * from the home screen like the legacy app's bookmark; `standalone` hides the browser frame.
 * The proxy lets this file, the icons and /offline through without a session: a browser
 * reads them before anyone signs in.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ASASLINE TMS",
    short_name: "ASASLINE",
    description: "Transportation management for ASASLINE S.A.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
