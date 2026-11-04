"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { useAuth } from "@/lib/auth/use-auth";
import { formatRole } from "@/lib/auth/user-display";
import { useLogout } from "@/lib/auth/use-logout";
import { cn } from "@/lib/utils";
import { filterNav } from "./filter-nav";
import { NAV_ITEMS } from "./nav.config";
import { isActive } from "./is-active";

const PANEL_ID = "mobile-nav-panel";

/**
 * Hamburger button + dropdown panel (below 768 px). The panel is positioned against the
 * nearest `relative` ancestor (the header), directly under it.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { logout, pending } = useLogout();
  // The panel is open only for the page it was opened on, so any navigation closes it
  // without needing an effect that resets state.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenedAt(null);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpenedAt(open ? null : pathname)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="rounded-md p-2 text-gray-600 outline-none hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {open && (
        <nav
          id={PANEL_ID}
          aria-label="Main"
          className="absolute inset-x-0 top-full z-10 border-t bg-white px-4 py-3 shadow-md"
        >
          <ul className="flex flex-col gap-1">
            {filterNav(NAV_ITEMS, user?.role).map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpenedAt(null)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 font-bold transition-colors",
                      active
                        ? "bg-blue-50 text-brand-primary"
                        : "text-gray-600 hover:text-brand-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-800">{user?.fullName}</p>
              <p className="text-xs text-gray-500">{user ? formatRole(user.role) : ""}</p>
            </div>
            <Button variant="destructive" onClick={logout} disabled={pending} aria-busy={pending}>
              <LogOut className="size-4" aria-hidden="true" />
              {pending ? "Signing out…" : "Logout"}
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
