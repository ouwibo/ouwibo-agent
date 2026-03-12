import type { Metadata } from "next";
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
  title: "OUWIBO AGENT | THE FUTURE OF AI",
  description: "Autonomous Neural Gateway Infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scrollbar-hide">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative overflow-hidden`}>
        {/* OpenClaw Atmospheric Effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 openclaw-gradient" />
          <div className="scanline" />
        </div>
        <div className="relative z-10 h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
