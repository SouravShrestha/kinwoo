import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import { APP_NAME } from "@kinwoo/core/app";
import { Suspense } from "react";

import { AppProviders } from "@/components/AppProviders";
import { AuthErrorNotice } from "@/components/AuthErrorNotice";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
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

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <body suppressHydrationWarning>
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
