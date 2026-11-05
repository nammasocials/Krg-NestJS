"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageSpinner } from "@/components/ui/shared/spinner";
import { useAuth } from "@/lib/auth/use-auth";
import { canAccess } from "./nav/filter-nav";
import { NAV_ITEMS } from "./nav/nav.config";

/** Shows private pages only to a verified session; everyone else is sent to /login. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, user, reason } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "anonymous") return;
    // A chosen sign-out goes to a plain /login; a lost session remembers where the user was.
    if (reason === "logout") router.replace("/login");
    else router.replace(`/login?next=${encodeURIComponent(`${pathname}${window.location.search}`)}`);
  }, [status, reason, pathname, router]);

  // A page restored from the back/forward cache is checked again instead of trusted.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  if (status !== "authenticated") {
    return <PageSpinner fullScreen label="Checking your session…" />;
  }

  if (!canAccess(NAV_ITEMS, pathname, user?.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-100 p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">403 — Not allowed</h1>
        <p className="text-gray-600">Your role does not have access to this page.</p>
        <a href="/dashboard" className="mt-2 font-bold text-brand-primary underline">
          Back to the dashboard
        </a>
      </div>
    );
  }
  return <>{children}</>;
}
