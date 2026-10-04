import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rubik_Wet_Paint } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

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

export const metadata: Metadata = {
  title: "The Miracle Ghost",
  description: "Interactive portfolio and storefront",
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
      className={`${geistSans.variable} ${geistMono.variable} ${dripFont.variable} antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
