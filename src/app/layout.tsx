import type { Metadata, Viewport } from "next";
import { Fredoka, Geist, Geist_Mono, Rubik_Wet_Paint } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import MiniGhost from "@/components/site/MiniGhost";
import { PageTransitionProvider } from "@/components/site/PageTransition";
import TabHaunt from "@/components/site/TabHaunt";
import { artistJsonLd, jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Stand-in for Aes's dripping hand lettering in the menu, until he sends his own
const dripFont = Rubik_Wet_Paint({
  variable: "--font-rubik-wet-paint",
  weight: "400",
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
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
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
      className={`${geistSans.variable} ${geistMono.variable} ${dripFont.variable} ${roundFont.variable} antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(artistJsonLd)} />
        <PageTransitionProvider>
          <NavBar />
          {children}
          <MiniGhost />
        </PageTransitionProvider>
        <TabHaunt />
        <Analytics />
      </body>
    </html>
  );
}
