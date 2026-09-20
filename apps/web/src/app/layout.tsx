import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ProjectHub - Project Management Hub",
  description: "From Lead to Handover. Operational Hub for Project Managers.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="light" className={`light ${inter.variable}`}>
      <body className="min-h-screen bg-[var(--ph-bg-subtle)] text-[var(--ph-text)] antialiased font-sans">
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
