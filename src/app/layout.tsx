import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HydrationMark } from "@/components/layout/hydration-mark";
import { ServiceWorker } from "@/components/layout/service-worker";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isProduction } from "@/server/runtime";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ASASLINE TMS", template: "%s · ASASLINE TMS" },
  description: "Transportation management for ASASLINE S.A.",
  applicationName: "ASASLINE TMS",
  appleWebApp: { capable: true, title: "ASASLINE", statusBarStyle: "default" },
};

/** The browser chrome follows the theme; both schemes are declared so form controls match. */
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
        <HydrationMark />
        <ServiceWorker enabled={isProduction} />
      </body>
    </html>
  );
}
