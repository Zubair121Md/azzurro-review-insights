import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  title: "Review Insights · Azzurro Hotels",
  description: "Weekly Booking.com guest review insights for Azzurro Hotels properties in Sydney.",
};

export const viewport: Viewport = {
  themeColor: "#06142b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
