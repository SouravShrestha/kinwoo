import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import { APP_NAME } from "@kinwoo/core/app";
import { preload } from "react-dom";
import { Suspense } from "react";

import { AppProviders } from "@/components/AppProviders";
import { AuthErrorNotice } from "@/components/AuthErrorNotice";
import devices from "@/lib/splash-devices.json";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) to resolve in iOS Safari; without it
  // the fixed tab bar sits under the home bar.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefefe" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
};

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const DESCRIPTION = "Everything shared. Nothing forgotten.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  applicationName: APP_NAME,
  title: APP_NAME,
  description: DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
    startupImage: devices.flatMap(([w, h, ratio]) =>
      (["light", "dark"] as const).map((scheme) => ({
        url: `/splash/${w * ratio}x${h * ratio}-${scheme}.png`,
        media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})`,
      })),
    ),
  },
  // Next 15 only emits mobile-web-app-capable, but iOS ignores startup images without this one.
  other: { "apple-mobile-web-app-capable": "yes" },
  openGraph: {
    title: APP_NAME,
    description: DESCRIPTION,
    type: "website",
    url: "/",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request makes every page render per request, which a nonce-based CSP requires.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  preload("/images/no-item.webp", { as: "image" });

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <body suppressHydrationWarning>
        {/* iOS 27 adds a progressive blur to the status bar unless a fixed element sits at the top; bg-clip-text keeps it invisible (opacity/visibility would defeat the check). */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[2147483647] h-[11px] bg-background bg-clip-text"
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
          <AppProviders>
            {children}
            {/* Keeps useSearchParams from suspending the whole tree. */}
            <Suspense fallback={null}>
              <AuthErrorNotice />
            </Suspense>
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
