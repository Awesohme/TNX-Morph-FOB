import type { Metadata, Viewport } from "next";
import { PwaBootstrap } from "@/components/pwa-bootstrap";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morph Ops Control Room",
  description: "A configurable operations control room for Morph by TNX cohorts.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#070614",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaBootstrap />
        <PwaInstallPrompt />
        {children}
      </body>
    </html>
  );
}
