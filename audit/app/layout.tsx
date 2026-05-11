import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/brand/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rinzler Studio — Plateforme d'audit hôtelier",
  description:
    "Outil interne d'audit de modernisation pour hôtels. Plateforme privée Rinzler Studio.",
  applicationName: "Rinzler Audit",
  // Default to noindex globally; the (client) landing page can override only
  // for the entry URL if/when that becomes desired (V1: nothing is indexed).
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
