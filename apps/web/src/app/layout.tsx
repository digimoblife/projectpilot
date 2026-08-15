import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "ProjectPilot — AI-Assisted Project Management Hub",
  description: "From Lead to Handover. Operational Hub for Project Managers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 antialiased text-slate-900">
        <AuthProvider>
          <Sidebar />
          <div className="md:pl-64 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
            <MobileNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
