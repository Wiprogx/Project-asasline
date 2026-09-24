import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HydrationMark } from "@/components/layout/hydration-mark";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ASASLINE TMS", template: "%s · ASASLINE TMS" },
  description: "Transportation management for ASASLINE S.A.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="dark" position="bottom-right" richColors />
        <HydrationMark />
      </body>
    </html>
  );
}
