import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Wigally | Verified Legal Services & Community Lawyers in Nigeria",
  description: "Find verified lawyers, discuss legal questions in our community, and book consultations in Nigeria.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wigally",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { AuthProvider } from "@/lib/auth";
import { RealTimeProvider } from "@/lib/realtime";
import { Navigation } from "@/components/Navigation";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { PWABanner } from "@/components/pwa/PWABanner";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-0">
        <ServiceWorkerRegister />
        <PWABanner />
        <AuthProvider>
          <RealTimeProvider>
            <Navigation />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
            <OfflineIndicator />
          </RealTimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
