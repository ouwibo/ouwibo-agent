import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
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
  title: "OUWIBO AGENT | ELITE AI",
  description: "Professional Autonomous Neural Gateway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scrollbar-hide">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative overflow-hidden bg-background text-foreground`}>
        {/* OpenClaw Atmospheric Effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="nebula" />
          <div className="stars" />
        </div>
        <div className="relative z-10 h-screen">
          {children}
        </div>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
