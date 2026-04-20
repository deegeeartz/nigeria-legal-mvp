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
  title: "Nigeria Legal MVP | Verified Lawyers",
  description: "Find and consult with verified legal professionals in Nigeria.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Legal MVP",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { AuthProvider } from "@/lib/auth";
import { RealTimeProvider } from "@/lib/realtime";
import { Navigation } from "@/components/Navigation";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-0">
        <AuthProvider>
          <RealTimeProvider>
            <Navigation />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
          </RealTimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

