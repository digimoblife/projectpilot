"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/lib/auth-context";

interface AppShellProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = new Set([
  "/login",
]);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    isLoading,
    isAuthenticated,
  } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [
    isAuthenticated,
    isLoading,
    isPublicRoute,
    pathname,
    router,
  ]);

  /*
   * Do not mount protected application pages until session restoration
   * has completed. This prevents protected pages from firing API calls
   * with an empty authentication state.
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-500">
            Memeriksa sesi...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Anonymous users may only render public routes.
   * Protected children are deliberately not mounted while redirecting.
   */
  if (!isAuthenticated) {
    if (!isPublicRoute) {
      return null;
    }

    return (
      <main className="min-h-screen bg-slate-50">
        {children}
      </main>
    );
  }

  /*
   * An authenticated user visiting /login is being redirected back to
   * the workspace. Avoid briefly rendering the login form.
   */
  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      <Sidebar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <MobileNav />
      </div>
    </>
  );
}
