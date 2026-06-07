import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { dict } from "@/lib/i18n";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${dict.brand.name} — ${dict.brand.tagline}`,
  description: dict.brand.tagline,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: dict.brand.name,
    statusBarStyle: "default",
  },
  // Favicon + Apple icon are provided by src/app/icon.png and
  // src/app/apple-icon.png (Next.js file conventions). PWA install icons are
  // declared in manifest.webmanifest.
};

export const viewport: Viewport = {
  themeColor: "#0F2740", // Signature Navy (§11)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
