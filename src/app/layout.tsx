import type { Metadata, Viewport } from "next";
import { Fredoka, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import MiniGhost from "@/components/site/MiniGhost";
import { PageTransitionProvider } from "@/components/site/PageTransition";
import Magnetic from "@/components/site/Magnetic";
import Reveal from "@/components/site/Reveal";
import SiteFooter from "@/components/site/SiteFooter";
import TabHaunt from "@/components/site/TabHaunt";
import { artistJsonLd, jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Aes's pick for the whole site (2026-10-20). Only the bold is loaded, so every weight shows bold.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: "700",
  subsets: ["latin"],
});

// Soft, rounded letters for the sleeping ghost's Z's
const roundFont = Fredoka({
  variable: "--font-fredoka",
  weight: "600",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // The tab reads only "The Miracle Ghost" on every page (Aes, 2026-10-22)
  title: { default: SITE_NAME, template: SITE_NAME },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The inline script below adds js-reveal before React loads
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${roundFont.variable} antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        {/* Lets the scroll reveals hide content before the first paint; without scripts, nothing is hidden */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js-reveal')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(artistJsonLd)} />
        <PageTransitionProvider>
          <NavBar />
          {children}
          <SiteFooter />
          <Reveal />
          <Magnetic />
          <MiniGhost />
        </PageTransitionProvider>
        <TabHaunt />
        <Analytics />
      </body>
    </html>
  );
}
